import { Switch, Text, View} from "react-native";
import { s} from "./ui";

export default function LinhaInterruptor ({ titulo, descricao, aoMudar, ocupado}){
    return (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={s.texto}>{titulo}</Text>
        {descricao ? <Text style={s.texto2}>{descricao}</Text> : null}
      </View>
      <Switch value={valor} onValueChange={aoMudar} disabled={ocupado} accessibilityLabel={titulo} />
    </View>
  );
}