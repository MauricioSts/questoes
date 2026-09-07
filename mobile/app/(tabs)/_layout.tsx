import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, BookOpen, House, Library, NotebookPen, RefreshCw } from "lucide-react-native";
import { useTema } from "@/theme/ThemeProvider";

// Mesmos 6 itens da BottomTab do web (components/BottomTab.tsx).
export default function TabsLayout() {
  const { hex } = useTema();
  // edge-to-edge: o conteúdo desenha por baixo da barra de gestos, então a altura
  // e o padding da tab bar precisam somar o inset ou os rótulos ficam cortados.
  const inset = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: hex.accent,
        tabBarInactiveTintColor: hex.dim,
        tabBarStyle: {
          backgroundColor: hex.surface,
          borderTopColor: hex.line,
          borderTopWidth: 1,
          height: 60 + inset.bottom,
          paddingBottom: inset.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color }) => <House size={20} color={color} /> }} />
      <Tabs.Screen name="estudar" options={{ title: "Estudar", tabBarIcon: ({ color }) => <BookOpen size={20} color={color} /> }} />
      <Tabs.Screen name="revisar" options={{ title: "Revisar", tabBarIcon: ({ color }) => <RefreshCw size={20} color={color} /> }} />
      <Tabs.Screen name="materias" options={{ title: "Matérias", tabBarIcon: ({ color }) => <Library size={20} color={color} /> }} />
      <Tabs.Screen name="caderno" options={{ title: "Caderno", tabBarIcon: ({ color }) => <NotebookPen size={20} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: "Stats", tabBarIcon: ({ color }) => <BarChart3 size={20} color={color} /> }} />
    </Tabs>
  );
}
