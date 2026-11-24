import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carregando } from '../components/Carregando';
import { TelaFormulario } from '../components/TelaFormulario';
import { useUid } from '../contexts/AuthContext';
import { useRegistro } from '../hooks/useRegistro';
import { buscarAgendamentosFuturos } from '../services/agendamentos';
import { buscarDocumento } from '../services/firestore';
import { avisarErro, avisarSePendente, gravar } from '../services/operacao';
import { atualizarServico, criarServico, excluirServico } from '../services/servicos';
import { spacing } from '../theme';
import { avisarExclusaoBloqueada, confirmarExclusao } from '../utils/confirmar';
import { LIMITES, validarServico } from '../utils/validacao';

export default function ServicoFormScreen({ navigation, route }) {
  const uid = useUid();
  const { servicoId } = route.params;
  const editando = Boolean(servicoId);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('30');
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar serviço' : 'Novo serviço' });
  }, [navigation, editando]);

  const carregando = useRegistro({
    id: servicoId,
    buscar: (id) => buscarDocumento(uid, 'servicos', id),
    aoCarregar: (s) => {
      setNome(s.nome);
      setPreco(s.preco.toFixed(2).replace('.', ','));
      setDuracao(String(s.duracaoMin));
    },
    navigation,
  });

  async function handleSalvar() {
    const { valido, erros: e, dados } = validarServico({ nome, preco, duracao });
    setErros(e);
    if (!valido) return;

    setSalvando(true);
    try {
      const resultado = await gravar(() =>
        servicoId ? atualizarServico(uid, servicoId, dados) : criarServico(uid, dados),
      );
      avisarSePendente(resultado);
      navigation.goBack();
    } catch (erro) {
      avisarErro(erro);
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    try {
      const futuros = await buscarAgendamentosFuturos(uid, 'servicoId', servicoId);
      if (futuros.length) {
        avisarExclusaoBloqueada(`O serviço "${nome}"`, futuros.length);
        return;
      }
    } catch (erro) {
      avisarErro(erro);
      return;
    }
    confirmarExclusao(`o serviço "${nome}"`, async () => {
      await gravar(() => excluirServico(uid, servicoId));
      navigation.goBack();
    });
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario>
      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Corte masculino"
        maxLength={LIMITES.nomeMax}
        erro={erros.nome}
      />
      <Campo
        rotulo="Preço (R$)"
        value={preco}
        onChangeText={setPreco}
        placeholder="0,00"
        keyboardType="decimal-pad"
        maxLength={9}
        erro={erros.preco}
      />
      <Campo
        rotulo="Duração (minutos)"
        value={duracao}
        onChangeText={(t) => setDuracao(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        erro={erros.duracao}
      />
      <View style={styles.acoes}>
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />
        {editando && (
          <Botao
            titulo="Excluir serviço"
            icone="trash-outline"
            variante="perigo"
            onPress={handleExcluir}
          />
        )}
      </View>
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  acoes: { gap: spacing.sm, marginTop: spacing.sm },
});
