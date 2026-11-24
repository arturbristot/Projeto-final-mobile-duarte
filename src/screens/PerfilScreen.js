import React, { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { updateProfile } from 'firebase/auth';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { Opcoes } from '../components/Opcoes';
import { TelaFormulario } from '../components/TelaFormulario';
import { useAuth, useUid } from '../contexts/AuthContext';
import { avisarErro, avisarSePendente, gravar } from '../services/operacao';
import { salvarPerfil } from '../services/perfil';
import { colors, fonts, radius, spacing } from '../theme';
import { formatarTelefone } from '../utils/format';
import { DIAS_SEMANA, FUNCIONAMENTO_PADRAO, validarFuncionamento } from '../utils/horarios';
import { LIMITES } from '../utils/validacao';

/** Centro inicial do mapa quando o local ainda não foi definido (Criciúma/SC). */
const REGIAO_PADRAO = {
  latitude: -28.6775,
  longitude: -49.3697,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const OPCOES_DIAS = DIAS_SEMANA.map((rotulo, valor) => ({ valor, rotulo }));
const OPCOES_INTERVALO = [15, 30, 60].map((v) => ({ valor: v, rotulo: `${v} min` }));

/** Formata enquanto digita: "930" -> "09:30". */
function mascaraHora(texto) {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, d.length - 2).padStart(2, '0')}:${d.slice(-2)}`;
}

export default function PerfilScreen() {
  const uid = useUid();
  const { user, perfil, sair } = useAuth();
  const funcionamentoAtual = perfil?.funcionamento ?? FUNCIONAMENTO_PADRAO;

  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [endereco, setEndereco] = useState(perfil?.endereco ?? '');
  const [telefone, setTelefone] = useState(perfil?.telefone ?? '');
  const [local, setLocal] = useState(
    perfil?.latitude !== undefined && perfil?.longitude !== undefined
      ? { latitude: perfil.latitude, longitude: perfil.longitude }
      : undefined,
  );
  const [dias, setDias] = useState(funcionamentoAtual.dias);
  const [abertura, setAbertura] = useState(funcionamentoAtual.abertura);
  const [fechamento, setFechamento] = useState(funcionamentoAtual.fechamento);
  const [intervaloMin, setIntervaloMin] = useState(funcionamentoAtual.intervaloMin);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [localizando, setLocalizando] = useState(false);

  async function usarMinhaLocalizacao() {
    setLocalizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Ative a localização para marcar o endereço automaticamente.',
        );
        return;
      }
      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coord = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
      setLocal(coord);

      // Preenche o endereço a partir das coordenadas, se ainda estiver vazio.
      if (!endereco.trim()) {
        const [lugar] = await Location.reverseGeocodeAsync(coord);
        if (lugar) {
          const partes = [lugar.street, lugar.streetNumber, lugar.district, lugar.city].filter(
            Boolean,
          );
          setEndereco(partes.join(', '));
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível obter sua localização.');
    } finally {
      setLocalizando(false);
    }
  }

  function abrirNoMapa() {
    if (!local) return;
    const { latitude, longitude } = local;
    const rotulo = encodeURIComponent(nome);
    const url = Platform.select({
      ios: `maps:0,0?q=${rotulo}@${latitude},${longitude}`,
      default: `geo:0,0?q=${latitude},${longitude}(${rotulo})`,
    });
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Nenhum app de mapas encontrado.'));
  }

  async function handleSalvar() {
    const funcionamento = {
      dias: [...dias].sort((a, b) => a - b),
      abertura,
      fechamento,
      intervaloMin,
    };
    const { erros: e } = validarFuncionamento(funcionamento);
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < LIMITES.nomeMin) e.nome = 'Informe o nome do negócio.';
    setErros(e);
    if (Object.keys(e).length) return;

    setSalvando(true);
    try {
      const resultado = await gravar(() =>
        salvarPerfil(uid, {
          nome: nomeLimpo,
          endereco: endereco.trim(),
          telefone,
          latitude: local?.latitude,
          longitude: local?.longitude,
          funcionamento,
        }),
      );
      if (user) updateProfile(user, { displayName: nomeLimpo }).catch(() => {});
      if (resultado === 'salvo') Alert.alert('Pronto!', 'Dados do negócio atualizados.');
      else avisarSePendente(resultado);
    } catch (erro) {
      avisarErro(erro);
    } finally {
      setSalvando(false);
    }
  }

  function handleSair() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  const regiao = local ? { ...local, latitudeDelta: 0.01, longitudeDelta: 0.01 } : REGIAO_PADRAO;

  return (
    <TelaFormulario>
      <Text style={styles.email}>Conectado como {user?.email}</Text>

      <Campo
        rotulo="Nome do negócio"
        value={nome}
        onChangeText={setNome}
        maxLength={LIMITES.nomeMax}
        erro={erros.nome}
      />
      <Campo
        rotulo="Telefone"
        value={telefone}
        onChangeText={(t) => setTelefone(formatarTelefone(t))}
        keyboardType="phone-pad"
        placeholder="(48) 99999-0000"
      />
      <Campo
        rotulo="Endereço"
        value={endereco}
        onChangeText={setEndereco}
        placeholder="Rua, número, bairro"
        maxLength={200}
      />

      <Text style={styles.secao}>Horário de funcionamento</Text>
      <Text style={styles.dica}>Os clientes só conseguem marcar dentro destes horários.</Text>
      <Opcoes
        rotulo="Dias de atendimento"
        opcoes={OPCOES_DIAS}
        valor={dias}
        onChange={setDias}
        multipla
        erro={erros.dias}
      />
      <View style={styles.linha}>
        <View style={styles.flex}>
          <Campo
            rotulo="Abre às"
            value={abertura}
            onChangeText={(t) => setAbertura(mascaraHora(t))}
            keyboardType="number-pad"
            placeholder="09:00"
            erro={erros.abertura}
          />
        </View>
        <View style={styles.flex}>
          <Campo
            rotulo="Fecha às"
            value={fechamento}
            onChangeText={(t) => setFechamento(mascaraHora(t))}
            keyboardType="number-pad"
            placeholder="19:00"
            erro={erros.fechamento}
          />
        </View>
      </View>
      <Opcoes
        rotulo="Horários de"
        opcoes={OPCOES_INTERVALO}
        valor={intervaloMin}
        onChange={setIntervaloMin}
        erro={erros.intervalo}
      />

      <Text style={styles.secao}>Localização no mapa</Text>
      <Text style={styles.dica}>Toque no mapa para posicionar o marcador.</Text>
      <View style={styles.mapaContainer}>
        <MapView
          style={styles.mapa}
          region={regiao}
          onPress={(e) => setLocal(e.nativeEvent.coordinate)}
        >
          {local && <Marker coordinate={local} title={nome} description={endereco} />}
        </MapView>
      </View>

      <View style={styles.acoes}>
        <Botao
          titulo="Usar minha localização"
          icone="locate"
          variante="secundario"
          onPress={usarMinhaLocalizacao}
          carregando={localizando}
        />
        {local && (
          <Botao
            titulo="Abrir no app de mapas"
            icone="navigate-outline"
            variante="texto"
            onPress={abrirNoMapa}
          />
        )}
        <Botao titulo="Salvar" icone="checkmark" onPress={handleSalvar} carregando={salvando} />
        <Botao
          titulo="Sair da conta"
          icone="log-out-outline"
          variante="perigo"
          onPress={handleSair}
        />
      </View>
    </TelaFormulario>
  );
}

const styles = StyleSheet.create({
  email: { color: colors.textMuted, marginBottom: spacing.md },
  secao: {
    fontSize: 19,
    fontFamily: fonts.titulo,
    color: colors.primary,
    marginTop: spacing.md,
  },
  dica: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  linha: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  mapaContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapa: { width: '100%', height: 220 },
  acoes: { gap: spacing.sm, marginTop: spacing.md },
});
