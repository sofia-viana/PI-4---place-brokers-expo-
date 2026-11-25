import { useCallback, useEffect, useRef, useState} from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { cancelarAparelho} from "../api/servicos";
import { ativarAvisosDeLead, FLAG_DESLIGADO, motivo, tokenAtual} from "../notificacoes/push";

const MENSAGENS_DO_MOTIVO = {
    [MOTIVOS.PERMISSAO_NEGADA]: "Permissão negada. Ative as notificações do app nas configurações do celular.",
  [MOTIVOS.SEM_PROJETO]: "O app ainda não está ligado ao projeto do Expo. Fale com o suporte.",
  [MOTIVOS.SEM_APARELHO]: "Os avisos no celular só funcionam em um aparelho de verdade.",
};

const MENSAGENS_PADRAO = "Não foi possível ativar agora. No Android o aviso não funciona no Expo Go: use o APK.";

const mensagemDoMotivo = (motivo) => MENSAGENS_DO_MOTIVO[motivo] ?? MENSAGENS_PADRAO;

async function cancelarNoServidor() {
    let token = null;
    try {
        token = await tokenDoAparelho();
    } catch {
        /* Expo Go no Android: nunca houve inscrição */
    }
    if (token) await cancelarAparelho(token);
}

/** Aviso de lead no celular: ligado por padrão (o push.js registra no login); aqui a pessoa pode desligar. */
export function useAvisosNoCelular() {
  const [ativo, setAtivo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  const lerEstado = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const desligado = await SecureStore.getItemAsync(FLAG_DESLIGADO);
      if (montado.current) setAtivo(status === "granted" && !desligado);
    } catch (e) {
      if (__DEV__) console.warn("Não foi possível ler o estado dos avisos:", e);
    }
  }, []);


    // Relê ao abrir a tela e sempre que o app volta ao primeiro plano
    // (a pessoa pode ter mudado a permissão nas configurações do celular).
  useEffect(() => {
    lerEstado();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") lerEstado();
    });
    return () => assinatura.remove();
  }, [lerEstado]);

  async function ligar() {
    setOcupado(true);
    try {
      const r = await ativarAvisosDeLead();
      if (!r.ativo) throw new Error(mensagemDoMotivo(r.motivo));
      await SecureStore.deleteItemAsync(FLAG_DESLIGADO);
      setAtivo(true);
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    try {
      await cancelarNoServidor();
      await SecureStore.setItemAsync(FLAG_DESLIGADO, "1");
      setAtivo(false);
    } finally {
      setOcupado(false);
    }
  }
  
  /** Na saída: tira este aparelho da conta (com o token pego de novo) e limpa a escolha. */
  async function aoSair() {
    try {
      await cancelarNoServidor();
    } catch (e) {
      // Sem internet: sai do mesmo jeito. O back deve descartar tokens inválidos (DeviceNotRegistered).
      if (__DEV__) console.warn("Não foi possível cancelar o aparelho no logout:", e);
    }
    await SecureStore.deleteItemAsync(FLAG_DESLIGADO).catch(() => {});
  }

  return { ativo, ocupado, ligar, desligar, aoSair };
}
