import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProtecaoErros } from './src/components/ProtecaoErros';
import { AuthProvider } from './src/contexts/AuthContext';
import { Rotas } from './src/navigation/Rotas';

export default function App() {
  return (
    <SafeAreaProvider>
      <ProtecaoErros>
        <AuthProvider>
          <StatusBar style="light" />
          <Rotas />
        </AuthProvider>
      </ProtecaoErros>
    </SafeAreaProvider>
  );
}
