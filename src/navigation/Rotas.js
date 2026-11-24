import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Botao } from '../components/Botao';
import { Carregando } from '../components/Carregando';
import { mensagemErroAuth, useAuth } from '../contexts/AuthContext';
import { TIPO } from '../services/perfil';
import { colors, fonts, spacing } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import AgendaScreen from '../screens/AgendaScreen';
import AgendamentoFormScreen from '../screens/AgendamentoFormScreen';
import PendentesScreen from '../screens/PendentesScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ClienteFormScreen from '../screens/ClienteFormScreen';
import ServicosScreen from '../screens/ServicosScreen';
import ServicoFormScreen from '../screens/ServicoFormScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import DespesaFormScreen from '../screens/DespesaFormScreen';
import PerfilScreen from '../screens/PerfilScreen';
import AgendarScreen from '../screens/cliente/AgendarScreen';
import MeusHorariosScreen from '../screens/cliente/MeusHorariosScreen';
import ContaClienteScreen from '../screens/cliente/ContaClienteScreen';

const Pilha = createNativeStackNavigator();
const Abas = createBottomTabNavigator();

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
};

const opcoesCabecalho = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.titulo, fontSize: 20 },
  headerShadowVisible: false,
};

function opcoesAbas(icones) {
  return ({ route }) => ({
    ...opcoesCabecalho,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.3 },
    tabBarIcon: ({ color, size }) => (
      <Ionicons name={icones[route.name]} size={size} color={color} />
    ),
  });
}

// ---------- App do barbeiro ----------

const iconesBarbeiro = {
  Agenda: 'calendar',
  Clientes: 'people',
  Servicos: 'cut',
  Financeiro: 'wallet',
  Perfil: 'storefront',
};

function AbasBarbeiro() {
  return (
    <Abas.Navigator screenOptions={opcoesAbas(iconesBarbeiro)}>
      <Abas.Screen name="Agenda" component={AgendaScreen} />
      <Abas.Screen name="Clientes" component={ClientesScreen} />
      <Abas.Screen name="Servicos" component={ServicosScreen} options={{ title: 'Serviços' }} />
      <Abas.Screen name="Financeiro" component={FinanceiroScreen} />
      <Abas.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Meu negócio' }} />
    </Abas.Navigator>
  );
}

function AppBarbeiro() {
  return (
    <Pilha.Navigator screenOptions={opcoesCabecalho}>
      <Pilha.Screen name="Abas" component={AbasBarbeiro} options={{ headerShown: false }} />
      <Pilha.Screen name="AgendamentoForm" component={AgendamentoFormScreen} />
      <Pilha.Screen
        name="Pendentes"
        component={PendentesScreen}
        options={{ title: 'Pedidos de horário' }}
      />
      <Pilha.Screen name="ClienteForm" component={ClienteFormScreen} />
      <Pilha.Screen name="ServicoForm" component={ServicoFormScreen} />
      <Pilha.Screen name="DespesaForm" component={DespesaFormScreen} />
    </Pilha.Navigator>
  );
}

// ---------- App do cliente ----------

const iconesCliente = {
  Agendar: 'add-circle',
  MeusHorarios: 'time',
  Conta: 'person',
};

function AppCliente() {
  return (
    <Abas.Navigator screenOptions={opcoesAbas(iconesCliente)}>
      <Abas.Screen name="Agendar" component={AgendarScreen} />
      <Abas.Screen
        name="MeusHorarios"
        component={MeusHorariosScreen}
        options={{ title: 'Meus horários' }}
      />
      <Abas.Screen name="Conta" component={ContaClienteScreen} options={{ title: 'Minha conta' }} />
    </Abas.Navigator>
  );
}

// ---------- Visitante ----------

function AppVisitante() {
  return (
    <Pilha.Navigator screenOptions={{ headerShown: false }}>
      <Pilha.Screen name="Login" component={LoginScreen} />
      <Pilha.Screen name="Cadastro" component={CadastroScreen} />
    </Pilha.Navigator>
  );
}

function ErroPerfil({ erro, sair }) {
  return (
    <View style={styles.erro}>
      <Text style={styles.titulo}>Não foi possível abrir sua conta</Text>
      <Text style={styles.texto}>{mensagemErroAuth(erro)}</Text>
      <Botao titulo="Sair e entrar de novo" variante="secundario" onPress={sair} />
    </View>
  );
}

export function Rotas() {
  const { user, perfil, carregando, erroPerfil, sair } = useAuth();

  if (carregando) return <Carregando />;
  if (user && erroPerfil) return <ErroPerfil erro={erroPerfil} sair={sair} />;

  let conteudo = <AppVisitante />;
  if (user && perfil?.tipo === TIPO.CLIENTE) conteudo = <AppCliente />;
  else if (user && perfil) conteudo = <AppBarbeiro />;

  return <NavigationContainer theme={tema}>{conteudo}</NavigationContainer>;
}

const styles = StyleSheet.create({
  erro: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  titulo: { fontSize: 22, fontFamily: fonts.titulo, color: colors.text },
  texto: { fontSize: 15, color: colors.textMuted },
});
