// Primeiro import do app: instala crypto.randomUUID antes de qualquer
// módulo que gere clientId de resposta (ver lib/polyfills.ts).
import "@/lib/polyfills";

import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTema } from "@/theme/ThemeProvider";
import { AuthProvider, useAuth } from "@/store/auth";
import { ConcursoProvider } from "@/store/concurso";
import { QuestoesProvider } from "@/store/questoes";
import { hidratarSegredos } from "@/lib/segredos";
import { iniciarSincronizacao } from "@/lib/answers";
import "../global.css";

void SplashScreen.preventAutoHideAsync();

/** Manda para /login quem não tem sessão, e tira de /login quem já tem. */
function Guarda() {
  const { usuario, carregando } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    const emLogin = segmentos[0] === "login";
    if (!usuario && !emLogin) router.replace("/login");
    else if (usuario && emLogin) router.replace("/");
  }, [usuario, carregando, segmentos, router]);

  return null;
}

function Rotas() {
  const { hex } = useTema();
  return (
    <>
      <StatusBar style={hex.esquema === "dark" ? "light" : "dark"} />
      <Guarda />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="sessao" />
        <Stack.Screen name="erros" />
        <Stack.Screen name="marcadas" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [pronto, setPronto] = useState(false);

  // Os segredos precisam estar em memória ANTES da primeira renderização: o
  // cliente HTTP lê o token de forma síncrona (SDD §6.1).
  useEffect(() => {
    hidratarSegredos()
      .catch(() => {}) // sem token guardado o app abre na tela de login
      .finally(() => {
        setPronto(true);
        void SplashScreen.hideAsync();
      });
  }, []);

  // Gatilhos de sincronização da fila offline: volta de rede e volta ao primeiro plano.
  useEffect(() => iniciarSincronizacao(), []);

  if (!pronto) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ConcursoProvider>
              <QuestoesProvider>
                <Rotas />
              </QuestoesProvider>
            </ConcursoProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
