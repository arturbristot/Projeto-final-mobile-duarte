import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { updateProfile } from 'firebase/auth';
import { Botao } from '../components/Botao';
import { Campo } from '../components/Campo';
import { TelaFormulario } from '../components/TelaFormulario';
import { useAuth, useUid } from '../contexts/AuthContext';
import { buscarEstabelecimento, salvarEstabelecimento } from '../services/estabelecimento';
import { colors, radius, spacing } from '../theme';
import { formatarTelefone } from '../utils/format';

/** Centro inicial do mapa quando o local ainda não foi definido (Criciúma/SC). */
const REGIAO_PADRAO = {
  latitude: -28.6775,
  longitude: -49.3697,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PerfilScreen() {
  const uid = useUid();
  const { user, sair } = useAuth();
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [local, setLocal] = useState();
  const [salvando, setSalvando] = useState(false);
  const [localizando, setLocalizando] = useState(false);

  useEffect(() => {
    buscarEstabelecimento(uid).then((e) => {
      if (!e) return;
      setNome(e.nome);
      setEndereco(e.endereco);
      setTelefone(e.telefone);
      if (e.latitude !== undefined && e.longitude !== undefined) {
        setLocal({ latitude: e.latitude, longitude: e.longitude });
      }
    });
  }, [uid]);

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
    Linking.openURL(url);
  }

  async function handleSalvar() {
    if (nome.trim().length < 2) {
      Alert.alert('Atenção', 'Informe o nome do negócio.');
      return;
    }
    setSalvando(true);
    try {
      await salvarEstabelecimento(uid, {
        nome: nome.trim(),
        endereco: endereco.trim(),
        telefone,
        latitude: local?.latitude,
        longitude: local?.longitude,
      });
      if (user) await updateProfile(user, { displayName: nome.trim() });
      Alert.alert('Pronto!', 'Dados do negócio atualizados.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar.');
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

      <Campo rotulo="Nome do negócio" value={nome} onChangeText={setNome} />
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
      />

      <Text style={styles.rotulo}>Localização no mapa</Text>
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
  rotulo: { fontSize: 14, fontWeight: '600', color: colors.text },
  dica: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  mapaContainer: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapa: { width: '100%', height: 220 },
  acoes: { gap: spacing.sm, marginTop: spacing.md },
});
