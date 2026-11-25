// Perfil e configurações (Sofia): nome, telefone, trocar senha, avisos e sair.
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, ScrollView, Text } from "react-native";
import { Botao, Campo, Cartao, s } from "../componentes/ui";
import LinhaInterruptor from "../componentes/LinhaInterruptor";
import Retorno from "../componentes/Retorno";
import { atualizarPerfil, meusDados, trocarSenha } from "../api/servicos";
import { useSessao } from "../contexto";
import { useAvisosNoCelular } from "../hooks/useAvisosNoCelular";
import { formatarTelefone, soDigitos } from "../utils/telefone";
import { validarSenha } from "../utils/validacao";
import { SITE_URL } from "../config";

const SENHA_VAZIA = { senhaAtual: "", novaSenha: "", confirmarSenha: "" };

export default function PerfilTela() {
  const { usuario, sair, atualizarUsuario } = useSessao();
  const celular = useAvisosNoCelular();

  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [nomeBase, setNomeBase] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(""); // só dígitos
  const [telefoneBase, setTelefoneBase] = useState("");
  const [errosPerfil, setErrosPerfil] = useState({});
  const [retornoPerfil, setRetornoPerfil] = useState(null);
  const nomeMexido = useRef(false);
  const telefoneMexido = useRef(false);

  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [verSenhas, setVerSenhas] = useState(false);
  const [errosSenha, setErrosSenha] = useState({});
  const [retornoSenha, setRetornoSenha] = useState(null);

  const [avisoEmail, setAvisoEmail] = useState(Boolean(usuario?.avisoLeadEmail));
  const [ocupadoEmail, setOcupadoEmail] = useState(false);
  const [retornoAvisos, setRetornoAvisos] = useState(null);

  const [salvando, setSalvando] = useState(null);

  // Refs para pular de campo em campo pelo teclado
  const telefoneRef = useRef(null);
  const novaSenhaRef = useRef(null);
  const confirmarRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    meusDados()
      .then((u) => {
        if (!vivo) return;
        setNomeBase(u.nome ?? "");
        setAvisoEmail(Boolean(u.avisoLeadEmail));
        if (!nomeMexido.current) setNome(u.nome ?? "");
        // se o back devolver o telefone, ele passa a ser a base de comparação
        const tel = soDigitos(u.telefone);
        setTelefoneBase(tel);
        if (!telefoneMexido.current) setTelefone(tel);
      })
      .catch((e) => { if (__DEV__) console.warn("meusDados falhou:", e); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  const perfilMudou = nome.trim() !== nomeBase || telefone !== telefoneBase;

  /** Padrão comum de salvar: limpa mensagens, roda a ação, mostra erro de campo ou sucesso. */
  async function executar({ chave, acao, aoSucesso, setErros, setRetorno, textoOk }) {
    setSalvando(chave);
    setErros({});
    setRetorno(null);
    try {
      const resultado = await acao();
      aoSucesso(resultado);
      setRetorno({ tipo: "ok", texto: textoOk });
    } catch (e) {
      const campos = e.fieldErrors ?? {};
      setErros(campos);
      setRetorno({
        tipo: "erro",
        texto: Object.keys(campos).length ? "Verifique os campos destacados." : e.message,
      });
    } finally {
      setSalvando(null);
    }
  }

  function salvarPerfil() {
    if (!nome.trim()) {
      setErrosPerfil({ nome: "Informe o nome." });
      return;
    }
    const corpo = {};
    if (nome.trim() !== nomeBase) corpo.nome = nome.trim();
    if (telefone !== telefoneBase) corpo.telefone = telefone; // vazio limpa o telefone

    return executar({
      chave: "perfil",
      setErros: setErrosPerfil,
      setRetorno: setRetornoPerfil,
      textoOk: "Dados salvos.",
      acao: () => atualizarPerfil(corpo),
      aoSucesso: (u) => {
        atualizarUsuario(u);
        setNomeBase(nome.trim());
        setTelefoneBase(telefone);
      },
    });
  }

  function salvarSenha() {
    const erros = validarSenha(senha);
    setErrosSenha(erros);
    setRetornoSenha(null);
    if (Object.keys(erros).length) return;

    return executar({
      chave: "senha",
      setErros: setErrosSenha,
      setRetorno: setRetornoSenha,
      textoOk: "Senha alterada.",
      acao: () => trocarSenha(senha),
      aoSucesso: () => setSenha(SENHA_VAZIA),
    });
  }

  // Ao digitar, some a mensagem antiga e o erro daquele campo.
  function mudarNome(v) {
    nomeMexido.current = true;
    setNome(v);
    setRetornoPerfil(null);
    setErrosPerfil((e) => ({ ...e, nome: undefined }));
  }

  function mudarTelefone(v) {
    telefoneMexido.current = true;
    setTelefone(soDigitos(v));
    setRetornoPerfil(null);
    setErrosPerfil((e) => ({ ...e, telefone: undefined }));
  }

  const mudarSenha = (chave) => (v) => {
    setSenha((x) => ({ ...x, [chave]: v }));
    setRetornoSenha(null);
    setErrosSenha((e) => ({ ...e, [chave]: undefined }));
  };

  async function alternarEmail(valor) {
    setAvisoEmail(valor);
    setOcupadoEmail(true);
    setRetornoAvisos(null);
    try {
      const u = await atualizarPerfil({ avisoLeadEmail: valor });
      atualizarUsuario(u);
    } catch (e) {
      setAvisoEmail(!valor);
      setRetornoAvisos({ tipo: "erro", texto: e.message });
    } finally {
      setOcupadoEmail(false);
    }
  }

  async function alternarCelular(valor) {
    setRetornoAvisos(null);
    try {
      if (valor) await celular.ligar();
      else await celular.desligar();
    } catch (e) {
      setRetornoAvisos({ tipo: "erro", texto: e.message });
    }
  }

  async function abrirSite() {
    try {
      await Linking.openURL(SITE_URL);
    } catch {
      Alert.alert("Não deu para abrir", `Acesse ${SITE_URL} no navegador.`);
    }
  }

  function confirmarSaida() {
    Alert.alert("Sair do app?", "Você para de receber avisos de lead neste celular.", [
      { text: "Ficar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await celular.aoSair(); // antes de apagar a sessão: o token ainda vale
          await sair();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={s.tela}
      contentContainerStyle={s.conteudo}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={s.titulo}>{usuario?.nome ?? "Meu perfil"}</Text>
      <Text style={s.subtitulo}>{usuario?.email}</Text>

      <Cartao>
        <Text style={s.tituloCartao} accessibilityRole="header">Meus dados</Text>
        <Campo
          rotulo="Nome"
          value={nome}
          onChangeText={mudarNome}
          erro={errosPerfil.nome}
          editable={!carregando}
          autoComplete="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => telefoneRef.current?.focus()}
        />
        <Campo
          inputRef={telefoneRef}
          rotulo="Telefone (WhatsApp)"
          value={formatarTelefone(telefone)}
          onChangeText={mudarTelefone}
          erro={errosPerfil.telefone}
          editable={!carregando}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="(81) 99999-9999"
        />
        <Text style={s.texto2}>Apague o número por completo e salve para removê-lo.</Text>
        <Botao
          titulo="Salvar"
          onPress={salvarPerfil}
          carregando={salvando === "perfil"}
          desativado={carregando || !perfilMudou}
        />
        <Retorno retorno={retornoPerfil} />
      </Cartao>

      <Cartao>
        <Text style={s.tituloCartao} accessibilityRole="header">Trocar senha</Text>
        <Campo
          rotulo="Senha atual"
          secureTextEntry={!verSenhas}
          value={senha.senhaAtual}
          erro={errosSenha.senhaAtual}
          onChangeText={mudarSenha("senhaAtual")}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => novaSenhaRef.current?.focus()}
        />
        <Campo
          inputRef={novaSenhaRef}
          rotulo="Nova senha (mín. 8 caracteres)"
          secureTextEntry={!verSenhas}
          value={senha.novaSenha}
          erro={errosSenha.novaSenha}
          onChangeText={mudarSenha("novaSenha")}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmarRef.current?.focus()}
        />
        <Campo
          inputRef={confirmarRef}
          rotulo="Confirmar nova senha"
          secureTextEntry={!verSenhas}
          value={senha.confirmarSenha}
          erro={errosSenha.confirmarSenha}
          onChangeText={mudarSenha("confirmarSenha")}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={salvarSenha}
        />
        <LinhaInterruptor titulo="Mostrar senhas" valor={verSenhas} aoMudar={setVerSenhas} />
        <Botao titulo="Trocar senha" tipo="contorno" onPress={salvarSenha} carregando={salvando === "senha"} />
        <Retorno retorno={retornoSenha} />
      </Cartao>

      <Cartao>
        <Text style={s.tituloCartao} accessibilityRole="header">Avisos de lead novo</Text>
        <LinhaInterruptor
          titulo="Aviso no celular"
          descricao="Notificação neste aparelho assim que chegar um lead."
          valor={celular.ativo}
          aoMudar={alternarCelular}
          ocupado={celular.ocupado}
        />
        <LinhaInterruptor
          titulo="Aviso por e-mail"
          descricao="Um e-mail a cada lead novo."
          valor={avisoEmail}
          aoMudar={alternarEmail}
          ocupado={ocupadoEmail}
        />
        <Retorno retorno={retornoAvisos} />
      </Cartao>

      <Botao titulo="Abrir o site da Place" tipo="contorno" icone="globe-outline" onPress={abrirSite} />
      <Botao titulo="Sair" tipo="perigo" icone="log-out-outline" onPress={confirmarSaida} />
    </ScrollView>
  );
}