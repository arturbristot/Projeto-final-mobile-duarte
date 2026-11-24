# MarcaAí

Aplicativo mobile de **agenda e gestão para barbearias**, desenvolvido para a **Duarte Barbearia** como projeto final (ABP) da disciplina de Desenvolvimento Mobile — Engenharia de Software, SATC, 2026.2.

## O problema

A barbearia organiza os horários por **WhatsApp e caderno de papel**. Os pedidos chegam misturados com outras conversas, o caderno fica no balcão e é comum marcar dois clientes no mesmo horário, esquecer de confirmar ou perder o histórico de quem é cliente fiel. O controle de quanto entrou e saiu no mês também é feito "de cabeça". Isso gera horários vagos, faltas sem aviso e perda de faturamento.

## A solução

O MarcaAí tem **duas áreas**, escolhidas no cadastro:

**Área da barbearia**
- Agenda do dia com navegação entre datas e resumo do faturamento previsto e concluído
- **Pedidos de horário** feitos pelos clientes no app, para aceitar ou recusar
- Cadastro de **clientes** com busca, observações e histórico de atendimentos
- Cadastro de **serviços** com preço e duração
- **Agendamentos** com aviso de conflito de horário e situação (pendente, agendado, concluído, cancelado, recusado)
- **Financeiro**: forma de pagamento ao concluir o atendimento, **despesas** por categoria e resumo do mês com receitas, despesas, lucro, ticket médio e gráficos
- **Lembrete pelo WhatsApp** com mensagem pronta para o cliente, em um toque
- **Horário de funcionamento** (dias, abertura, fechamento e intervalo entre horários)
- **Mapa e geolocalização** para marcar o endereço da barbearia

**Área do cliente**
- Escolhe o serviço, o dia e um **horário livre** calculado pelo app (funcionamento da barbearia menos os horários já ocupados)
- Acompanha em tempo real se o pedido foi aceito, e pode **cancelar** horários futuros
- Abre a localização da barbearia no app de mapas ("Como chegar")

## Requisitos do ABP atendidos

| Requisito | Como foi atendido |
|---|---|
| Persistência de dados | Firebase Cloud Firestore, com regras de segurança e validação de dados no servidor |
| Mínimo de 6 telas | 16 telas (veja abaixo) |
| UX amigável | Botões grandes, listas vazias explicativas, validação com mensagens claras, horários livres prontos para tocar |
| Login/senha e token | Firebase Authentication (JWT renovado automaticamente, sessão salva no AsyncStorage) |
| Tecnologia | React Native + Expo (JavaScript) |
| Nome e ícone personalizados | "MarcaAí", com a identidade visual da Duarte Barbearia em `assets/` |
| CRUD completo | Clientes, Serviços, Agendamentos e Despesas (cadastro, edição, listagem e exclusão) |
| Git | Este repositório |
| **Opcionais** | Mapas e geolocalização (`react-native-maps` + `expo-location`) e integração com o WhatsApp |

**Telas:** Login, Cadastro · (barbearia) Agenda, Agendamento, Pedidos de horário, Clientes, Cliente, Serviços, Serviço, Financeiro, Despesa, Meu negócio · (cliente) Agendar, Meus horários, Minha conta · Tela de erro inesperado.

## Robustez

- **Validação em duas camadas:** no app (`src/utils/validacao.js`) e no servidor, pelas regras do Firestore, com os mesmos limites. Dados inválidos não entram no banco, mesmo que alguém tente gravar sem passar pelo app.
- **Funciona sem internet:** as gravações ficam na fila do Firestore e são enviadas quando a conexão volta; o app avisa em vez de travar (`src/services/operacao.js`).
- **Dados consistentes:** ao editar um cliente ou serviço, os agendamentos futuros são atualizados na mesma gravação (batch atômico). Não é possível excluir cliente ou serviço com horários marcados.
- **Privacidade do cliente:** cada agendamento tem um espelho só com início e fim (`ocupados`), usado para mostrar horários livres sem expor nome ou telefone de outros clientes.
- **Erros tratados:** mensagens amigáveis para falhas do Firebase, registro excluído em outro aparelho e uma tela de proteção contra erros inesperados (sem tela branca).
- **Testes automatizados:** regras de negócio (validação, horários livres, conflitos, financeiro) e regras de segurança do Firestore no emulador oficial.

## Tecnologias

- React Native 0.88 + Expo SDK 58 (JavaScript)
- React Navigation (pilha de telas + abas inferiores)
- Firebase Authentication e Cloud Firestore
- react-native-maps, expo-location, @react-native-community/datetimepicker
- Jest (`jest-expo`) e `@firebase/rules-unit-testing` para os testes

## Estrutura do código

```
src/
├── components/   Componentes visuais reutilizáveis (Botao, Campo, Opcoes, GraficoBarras...)
├── config/       Inicialização do Firebase
├── contexts/     AuthContext: login, cadastro, perfil (barbearia ou cliente) e token
├── hooks/        useColecao (listas em tempo real) e useRegistro (carregar para editar)
├── navigation/   Rotas: app da barbearia, app do cliente e visitante
├── screens/      Telas da barbearia; screens/cliente/ tem as telas do cliente
├── services/     Acesso ao Firestore (um arquivo por entidade) e gravação segura
├── utils/        Regras de negócio puras: validação, horários, financeiro, status
└── theme.js      Cores e fontes da identidade visual
__tests__/        Testes das regras de negócio
regras/           Testes das regras de segurança do Firestore
```

### Modelo de dados (Firestore)

```
usuarios/{uid}                    tipo ('barbeiro' | 'cliente'), nome, telefone
                                  + barbearia: endereco, latitude, longitude, funcionamento
usuarios/{uid}/servicos/{id}      nome, preco, duracaoMin
usuarios/{uid}/clientes/{id}      nome, telefone, observacoes
usuarios/{uid}/agendamentos/{id}  clienteId, clienteUid?, clienteNome, clienteTelefone,
                                  servicoId, servicoNome, preco, duracaoMin, data,
                                  status, origem?, formaPagamento?
usuarios/{uid}/ocupados/{id}      inicio, fim   (espelho público do agendamento)
usuarios/{uid}/despesas/{id}      descricao, valor, categoria, data
```

## Como rodar

### 1. Criar o projeto no Firebase

1. Acesse o [Console do Firebase](https://console.firebase.google.com) e crie um projeto.
2. Em **Authentication > Método de login**, ative **E-mail/senha**.
3. Em **Firestore Database**, crie o banco de dados.
4. Na aba **Regras** do Firestore, cole o conteúdo de [`firestore.rules`](firestore.rules) e publique. **Repita sempre que o arquivo mudar.**
5. Em **Configurações do projeto > Seus apps**, adicione um **App da Web** e copie as credenciais.

### 2. Configurar e iniciar o app

```bash
npm install
cp .env.example .env   # e preencha com as credenciais do Firebase
npx expo start
```

Abra o app **Expo Go** no celular e leia o QR Code (o celular e o computador precisam estar na mesma rede Wi-Fi).

### 3. Testes

```bash
npm test               # regras de negócio
npm run test:regras    # regras de segurança no emulador (precisa de Java instalado)
npm run lint
```

## Equipe

- Artur Bristot Rocha
- Eric Garcia
- Guilherme Brignolli

Professora: Mariane Joaquim Melo
