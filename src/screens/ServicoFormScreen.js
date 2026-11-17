import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { getDoc } from 'firebase/firestore';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { TelaFormulario } from '../components/TelaFormulario';
import { useUid } from '../contexts/AuthContext';
import { refDocumento } from '../services/firestore';
import { atualizarServico, criarServico, excluirServico } from '../services/servicos';
import { spacing } from '../theme';
import { confirmarExclusao } from '../utils/confirmar';
import { lerNumero } from '../utils/format';

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

  useEffect(() => {
    if (!servicoId) return;
    getDoc(refDocumento(uid, 'servicos', servicoId)).then((snap) => {
      const s = snap.data();
      if (!s) return;
      setNome(s.nome);
      setPreco(s.preco.toFixed(2).replace('.', ','));
      setDuracao(String(s.duracaoMin));
    });
  }, [uid, servicoId]);

  function validar() {
    const e = {};
    const valor = lerNumero(preco);
    const minutos = parseInt(duracao, 10);
    if (!nome.trim()) e.nome = 'Informe o nome do serviço.';
    if (isNaN(valor) || valor < 0) e.preco = 'Informe um preço válido.';
    if (isNaN(minutos) || minutos < 5) e.duracao = 'Duração mínima de 5 minutos.';
    setErros(e);
    return Object.keys(e).length ? null : { nome: nome.trim(), preco: valor, duracaoMin: minutos };
  }

  async function handleSalvar() {
    const dados = validar();
    if (!dados) return;
    setSalvando(true);
    try {
      if (servicoId) await atualizarServico(uid, servicoId, dados);
      else await criarServico(uid, dados);
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o serviço.');
      setSalvando(false);
    }
  }

  function handleExcluir() {
    if (!servicoId) return;
    confirmarExclusao(`o serviço "${nome}"`, async () => {
      await excluirServico(uid, servicoId);
      navigation.goBack();
    });
  }

  return (
    <TelaFormulario>
      <Campo
        rotulo="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder="Ex.: Corte masculino"
        erro={erros.nome}
      />
      <Campo
        rotulo="Preço (R$)"
        value={preco}
        onChangeText={setPreco}
        placeholder="0,00"
        keyboardType="decimal-pad"
        erro={erros.preco}
      />
      <Campo
        rotulo="Duração (minutos)"
        value={duracao}
        onChangeText={setDuracao}
        keyboardType="number-pad"
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
