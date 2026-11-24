import React, { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Carregando } from '../components/Carregando';
import { Opcoes } from '../components/Opcoes';
import { SeletorDataHora } from '../components/SeletorDataHora';
import { TelaFormulario } from '../components/TelaFormulario';
import { useUid } from '../contexts/AuthContext';
import { useRegistro } from '../hooks/useRegistro';
import {
  atualizarDespesa,
  buscarDespesa,
  criarDespesa,
  excluirDespesa,
} from '../services/despesas';
import { avisarErro, avisarSePendente, gravar } from '../services/operacao';
import { colors, spacing } from '../theme';
import { confirmarExclusao } from '../utils/confirmar';
import { CATEGORIAS_DESPESA, validarDespesa } from '../utils/financeiro';

const OPCOES_CATEGORIA = CATEGORIAS_DESPESA.map((c) => ({ valor: c, rotulo: c }));

export default function DespesaFormScreen({ navigation, route }) {
  const uid = useUid();
  const { despesaId } = route.params;
  const editando = Boolean(despesaId);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [data, setData] = useState(() => new Date());
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar despesa' : 'Nova despesa' });
  }, [navigation, editando]);

  const carregando = useRegistro({
    id: despesaId,
    buscar: (id) => buscarDespesa(uid, id),
    aoCarregar: (d) => {
      setDescricao(d.descricao);
      setValor(d.valor.toFixed(2).replace('.', ','));
      setCategoria(d.categoria);
      setData(d.data);
    },
    navigation,
  });

  async function handleSalvar() {
    const { valido, erros: e, dados } = validarDespesa({ descricao, valor, categoria, data });
    setErros(e);
    if (!valido) return;

    setSalvando(true);
    try {
      const resultado = await gravar(() =>
        despesaId ? atualizarDespesa(uid, despesaId, dados) : criarDespesa(uid, dados),
      );
      avisarSePendente(resultado);
      navigation.goBack();
    } catch (erro) {
      avisarErro(erro);
      setSalvando(false);
    }
  }

  function handleExcluir() {
    confirmarExclusao(`a despesa "${descricao}"`, async () => {
      await gravar(() => excluirDespesa(uid, despesaId));
      navigation.goBack();
    });
  }

  if (carregando) return <Carregando />;

  return (
    <TelaFormulario>
      <Campo
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: Conta de luz"
        maxLength={80}
        erro={erros.descricao}
      />
      <Campo
        rotulo="Valor (R$)"
        value={valor}
        onChangeText={setValor}
        placeholder="0,00"
        keyboardType="decimal-pad"
        maxLength={10}
        erro={erros.valor}
      />
      <Opcoes
        rotulo="Categoria"
        opcoes={OPCOES_CATEGORIA}
        valor={categoria}
        onChange={setCategoria}
        erro={erros.categoria}
      />
      <Text style={styles.rotulo}>Data</Text>
      <SeletorDataHora valor={data} onChange={setData} somenteData />

      <View style={styles.acoes}>
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />
        {editando && (
          <Botao
            titulo="Excluir despesa"
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
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  acoes: { gap: spacing.sm, marginTop: spacing.sm },
});
