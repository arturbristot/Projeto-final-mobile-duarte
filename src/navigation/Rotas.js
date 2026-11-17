import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { colors, fonts } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import AgendaScreen from '../screens/AgendaScreen';
import AgendamentoFormScreen from '../screens/AgendamentoFormScreen';
import ClientesScreen from '../screens/ClientesScreen';
import ClienteFormScreen from '../screens/ClienteFormScreen';
import ServicosScreen from '../screens/ServicosScreen';
import ServicoFormScreen from '../screens/ServicoFormScreen';
import PerfilScreen from '../screens/PerfilScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
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

const iconesAbas = {
  Agenda: 'calendar',
  Clientes: 'people',
  Servicos: 'cut',
  Perfil: 'storefront',
};

function AbasPrincipais() {
  return (
    <Abas.Navigator
      screenOptions={({ route }) => ({
        ...opcoesCabecalho,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, letterSpacing: 0.3 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={iconesAbas[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Abas.Screen name="Agenda" component={AgendaScreen} />
      <Abas.Screen name="Clientes" component={ClientesScreen} />
      <Abas.Screen name="Servicos" component={ServicosScreen} options={{ title: 'Serviços' }} />
      <Abas.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Meu negócio' }} />
    </Abas.Navigator>
  );
}

export function Rotas() {
  const { user, carregando } = useAuth();

  if (carregando) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema}>
      {user ? (
        <AppStack.Navigator screenOptions={opcoesCabecalho}>
          <AppStack.Screen
            name="Abas"
            component={AbasPrincipais}
            options={{ headerShown: false }}
          />
          <AppStack.Screen name="AgendamentoForm" component={AgendamentoFormScreen} />
          <AppStack.Screen name="ClienteForm" component={ClienteFormScreen} />
          <AppStack.Screen name="ServicoForm" component={ServicoFormScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Cadastro" component={CadastroScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
