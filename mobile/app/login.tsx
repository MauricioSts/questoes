import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { Botao } from "@/components/Botao";
import { Card } from "@/components/Card";
import { Fraco, Rotulo, Titulo, Txt } from "@/components/Texto";
import { useTema } from "@/theme/ThemeProvider";
import { useAuth } from "@/store/auth";
import { ApiError } from "@/lib/api";

export default function Login() {
  const { hex, raio } = useTema();
  const { login, registrar } = useAuth();

  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const criando = modo === "criar";

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      if (criando) await registrar(nome.trim(), email.trim(), senha);
      else await login(email.trim(), senha);
      // A navegação é do <Guarda> no _layout: ele reage ao usuário aparecer.
    } catch (e) {
      // Sem rede o fetch rejeita com TypeError, não com ApiError — vale distinguir,
      // senão todo problema de conexão vira "credenciais inválidas" para o usuário.
      if (e instanceof ApiError) setErro(e.message);
      else setErro("Não foi possível falar com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = {
    borderWidth: 1,
    borderColor: hex.line,
    borderRadius: raio.sm,
    backgroundColor: hex.surface2,
    color: hex.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="flex-1 justify-center p-5">
        <Card className="gap-4">
          <View className="gap-1">
            <Titulo>{criando ? "Criar conta" : "Entrar"}</Titulo>
            <Fraco>devconcursado</Fraco>
          </View>

          {criando && (
            <View className="gap-1.5">
              <Rotulo>Nome</Rotulo>
              <TextInput
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                placeholderTextColor={hex.dim}
                style={campo}
              />
            </View>
          )}

          <View className="gap-1.5">
            <Rotulo>E-mail</Rotulo>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="voce@exemplo.com"
              placeholderTextColor={hex.dim}
              style={campo}
            />
          </View>

          <View className="gap-1.5">
            <Rotulo>Senha</Rotulo>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={hex.dim}
              style={campo}
              onSubmitEditing={enviar}
            />
          </View>

          {erro && <Txt style={{ color: hex.accentText }}>{erro}</Txt>}

          {enviando ? (
            <ActivityIndicator color={hex.accent} />
          ) : (
            <Botao titulo={criando ? "Criar conta" : "Entrar"} onPress={enviar} />
          )}

          <Pressable onPress={() => { setModo(criando ? "entrar" : "criar"); setErro(null); }} hitSlop={8}>
            <Fraco className="text-center">
              {criando ? "Já tenho conta" : "Criar uma conta"}
            </Fraco>
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
