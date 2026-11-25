import { useEffect } from "react";
import { AccessibilityInfo, Text} from "react-native";
import { Erro } from "./ui";
import { cores } from "../tema";

/** Resultado da ação, logo embaixo do botão que a pessoa tocou. */
export default function Retorno ({ retorno }) {
    const texto = retorno?.texto;

    // accessibilityLiveRegion só vale no Android; no iOS é preciso anunciar.
    useEffect(() => {
        if (texto) AccessibilityInfo.announceForAccessibility(texto);
    }, [texto]);

    if (!texto) return null;
    if (retorno.tipo === "ok"){
        return <Text style  ={{ color: cores.ok}} accessibilityLiveRegion="polite">{texto}</Text>;
    }
    return <Erro texto ={texto}/>;
}
