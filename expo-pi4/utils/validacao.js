// mesma regras do back (PATCH /auth/senha) para avisar sem ir ao servidor

export function validarSenha ({ senhaAtual, novaSenha, confirmarSenha}) {
    const erros = {};
    if (!ssenhaAtual) erros.senhaAtual = "Informe a senha atual.";
    if(!novaSenha || novaSenha.length < 8) {
        erros.novaSenha = "A nova senha deve ter pelo menos 8 caracteres.";
    } else if (novaSenha === senhaAtual){
        erros.novaSenha = " A nova senha precisa ser diferente da atual.";
    }
    if (confirmarSenha !== novaSenha ) erros.confirmarSenha = "As senhas não coincidem.";
    return erros;
}