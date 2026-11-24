/**
 * Testes das regras de segurança (firestore.rules) no emulador do Firestore.
 * Rodar com: npm run test:regras
 */
const fs = require('fs');
const path = require('path');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  setLogLevel,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} = require('firebase/firestore');

const BARBEIRO = 'barbeiro1';
const OUTRO_BARBEIRO = 'barbeiro2';
const CLIENTE = 'cliente1';
const OUTRO_CLIENTE = 'cliente2';

const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
const ts = (data, minutos = 0) => Timestamp.fromDate(new Date(data.getTime() + minutos * 60_000));

let ambiente;

function dbDe(uid) {
  return uid
    ? ambiente.authenticatedContext(uid).firestore()
    : ambiente.unauthenticatedContext().firestore();
}

function pedido(uid, extras = {}) {
  return {
    clienteId: uid,
    clienteUid: uid,
    clienteNome: 'Cliente Um',
    clienteTelefone: '(48) 99999-0000',
    servicoId: 'corte',
    servicoNome: 'Corte',
    preco: 40,
    duracaoMin: 30,
    data: ts(amanha),
    status: 'pendente',
    origem: 'app',
    ...extras,
  };
}

beforeAll(async () => {
  setLogLevel('error'); // as recusas esperadas não poluem a saída
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-marcaai',
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'usuarios', BARBEIRO), {
      tipo: 'barbeiro',
      nome: 'Duarte Barbearia',
      endereco: 'Rua A, 1',
      telefone: '(48) 3333-0000',
    });
    await setDoc(doc(db, 'usuarios', CLIENTE), {
      tipo: 'cliente',
      nome: 'Cliente Um',
      telefone: '(48) 99999-0000',
    });
    await setDoc(doc(db, 'usuarios', BARBEIRO, 'servicos', 'corte'), {
      nome: 'Corte',
      preco: 40,
      duracaoMin: 30,
    });
    await setDoc(doc(db, 'usuarios', BARBEIRO, 'clientes', 'pedro'), {
      nome: 'Pedro',
      telefone: '(48) 98888-0000',
    });
    await setDoc(doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'doPedro'), {
      clienteId: 'pedro',
      clienteNome: 'Pedro',
      clienteTelefone: '(48) 98888-0000',
      servicoId: 'corte',
      servicoNome: 'Corte',
      preco: 40,
      duracaoMin: 30,
      data: ts(amanha, 60),
      status: 'agendado',
    });
    await setDoc(doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'doCliente'), pedido(CLIENTE));
  });
});

afterAll(async () => {
  await ambiente.cleanup();
});

describe('visitante sem login', () => {
  it('não lê nada', async () => {
    await assertFails(getDoc(doc(dbDe(null), 'usuarios', BARBEIRO)));
    await assertFails(getDocs(collection(dbDe(null), 'usuarios', BARBEIRO, 'servicos')));
  });
});

describe('barbearia', () => {
  it('gerencia os próprios clientes', async () => {
    const db = dbDe(BARBEIRO);
    await assertSucceeds(getDocs(collection(db, 'usuarios', BARBEIRO, 'clientes')));
    await assertSucceeds(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'clientes', 'novo'), {
        nome: 'Maria',
        telefone: '(48) 97777-0000',
        observacoes: '',
      }),
    );
  });

  it('não acessa dados de outra barbearia', async () => {
    const db = dbDe(OUTRO_BARBEIRO);
    await assertFails(getDocs(collection(db, 'usuarios', BARBEIRO, 'clientes')));
    await assertFails(getDoc(doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'doPedro')));
  });

  it('tem os dados validados no servidor', async () => {
    const db = dbDe(BARBEIRO);
    await assertFails(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'servicos', 'x'), {
        nome: 'X',
        preco: -5,
        duracaoMin: 30,
      }),
    );
    await assertFails(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'servicos', 'x'), {
        nome: 'Barba',
        preco: 20,
        duracaoMin: 30,
        campoExtra: true,
      }),
    );
    await assertFails(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'despesas', 'd'), {
        descricao: 'Festa',
        valor: 100,
        categoria: 'Diversão',
        data: ts(ontem),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'despesas', 'd'), {
        descricao: 'Conta de luz',
        valor: 120.5,
        categoria: 'Contas',
        data: ts(ontem),
      }),
    );
  });

  it('não muda o tipo da conta', async () => {
    await assertFails(updateDoc(doc(dbDe(BARBEIRO), 'usuarios', BARBEIRO), { tipo: 'cliente' }));
  });

  it('conclui um atendimento com a forma de pagamento', async () => {
    const ref = doc(dbDe(BARBEIRO), 'usuarios', BARBEIRO, 'agendamentos', 'doPedro');
    await assertSucceeds(updateDoc(ref, { status: 'concluido', formaPagamento: 'pix' }));
    await assertFails(updateDoc(ref, { formaPagamento: 'cheque' }));
  });
});

describe('cliente', () => {
  it('vê a barbearia e os serviços', async () => {
    const db = dbDe(CLIENTE);
    await assertSucceeds(getDoc(doc(db, 'usuarios', BARBEIRO)));
    await assertSucceeds(
      getDocs(query(collection(db, 'usuarios'), where('tipo', '==', 'barbeiro'))),
    );
    await assertSucceeds(getDocs(collection(db, 'usuarios', BARBEIRO, 'servicos')));
  });

  it('não vê clientes, agendamentos de outros nem perfis de outros clientes', async () => {
    const db = dbDe(CLIENTE);
    await assertFails(getDocs(collection(db, 'usuarios', BARBEIRO, 'clientes')));
    await assertFails(getDoc(doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'doPedro')));
    await assertFails(getDocs(collection(db, 'usuarios', BARBEIRO, 'agendamentos')));
    await assertFails(getDoc(doc(dbDe(OUTRO_CLIENTE), 'usuarios', CLIENTE)));
  });

  it('vê só os próprios agendamentos', async () => {
    const db = dbDe(CLIENTE);
    const meus = query(
      collection(db, 'usuarios', BARBEIRO, 'agendamentos'),
      where('clienteUid', '==', CLIENTE),
    );
    await assertSucceeds(getDocs(meus));
  });

  it('pede um horário junto com o espelho de ocupado', async () => {
    const db = dbDe(CLIENTE);
    const lote = writeBatch(db);
    lote.set(doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'novo'), pedido(CLIENTE));
    lote.set(doc(db, 'usuarios', BARBEIRO, 'ocupados', 'novo'), {
      inicio: ts(amanha),
      fim: ts(amanha, 30),
    });
    await assertSucceeds(lote.commit());
  });

  it('não marca já confirmado, no nome de outro ou no passado', async () => {
    const db = dbDe(CLIENTE);
    const ref = doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'novo');
    await assertFails(setDoc(ref, pedido(CLIENTE, { status: 'agendado' })));
    await assertFails(setDoc(ref, pedido(OUTRO_CLIENTE)));
    await assertFails(setDoc(ref, pedido(CLIENTE, { data: ts(ontem) })));
  });

  it('não cria espelho de ocupado sem agendamento próprio', async () => {
    const db = dbDe(CLIENTE);
    await assertFails(
      setDoc(doc(db, 'usuarios', BARBEIRO, 'ocupados', 'falso'), {
        inicio: ts(amanha),
        fim: ts(amanha, 30),
      }),
    );
  });

  it('cancela o próprio pedido, mas não altera outros campos', async () => {
    const db = dbDe(CLIENTE);
    const ref = doc(db, 'usuarios', BARBEIRO, 'agendamentos', 'doCliente');
    await assertFails(updateDoc(ref, { preco: 1 }));
    await assertFails(updateDoc(ref, { status: 'agendado' }));
    await assertSucceeds(updateDoc(ref, { status: 'cancelado' }));
  });

  it('não cancela agendamento de outra pessoa', async () => {
    const ref = doc(dbDe(CLIENTE), 'usuarios', BARBEIRO, 'agendamentos', 'doPedro');
    await assertFails(updateDoc(ref, { status: 'cancelado' }));
  });
});
