import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Image,
  ScrollView
} from "react-native";
import BackButton from "@/components/nav/BackButton";

type Attachment = { uri: string; name?: string; mime?: string };
type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  attachments?: Attachment[];
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "800", marginTop: 10 },
  sub: { fontSize: 13, color: "#64748B", marginBottom: 12 },

  bubble: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 10
  },
  user: { alignSelf: "flex-end", backgroundColor: "#F1F8F4" },
  bot: { alignSelf: "flex-start", backgroundColor: "#F8FAFC" },
  role: { fontSize: 11, fontWeight: "800", color: "#64748B" },
  txt: { marginTop: 6, fontSize: 14 },

  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap"
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
    flexGrow: 1
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  btnPrimary: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  btnText: { fontWeight: "800" },
  btnTextPrimary: { color: "#fff" },

  thumbs: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 8 },
  thumb: {
    width: 110,
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  }
});

function id() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

// web/native picker (native optionally uses expo-image-picker if installed)
let ImagePicker: any = null;
try {
  ImagePicker = require("expo-image-picker");
} catch {}

async function pickImage(): Promise<Attachment | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = (input as any).files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () =>
          resolve({ uri: String(reader.result), name: file.name, mime: file.type });
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  if (!ImagePicker) {
    throw new Error("Install expo-image-picker: npx expo install expo-image-picker");
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85
  });

  if (res.canceled) return null;
  const a = res.assets?.[0];
  if (!a?.uri) return null;
  return { uri: a.uri, name: a.fileName, mime: a.mimeType };
}

export default function AiScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: id(),
      role: "assistant",
      text: "Ask me anything — attach a photo if you want.",
      at: Date.now()
    }
  ]);

  const attach = async () => {
    try {
      const a = await pickImage();
      if (!a) return;
      setAttachments((p) => [...p, a]);
    } catch (err) {
      console.warn("Image picker error:", err);
    }
  };

  const send = async () => {
    if (!draft.trim() && attachments.length === 0) return;

    const userMsg: Msg = {
      id: id(),
      role: "user",
      text: draft.trim(),
      at: Date.now(),
      attachments: attachments.length ? attachments : undefined
    };
    setMsgs((p) => [...p, userMsg]);
    setDraft("");
    setAttachments([]);

    // V1 stub reply (next: backend + context + tool-calls)
    const bot: Msg = {
      id: id(),
      role: "assistant",
      text: userMsg.attachments?.length
        ? "Got the image. Next we'll wire vision + saving into logs. What do you want me to check (deficiency, pests, structure, stage)?"
        : "Got it. Next we'll connect me to grows/logs/tasks and enable tool-calls (VPD, runoff, feed, etc.).",
      at: Date.now()
    };
    setMsgs((p) => [...p, bot]);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
  };

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>Assistant</Text>
      <Text style={styles.sub}>V1 UI wired. Next: context + tool calls + uploads.</Text>

      <ScrollView ref={scrollRef as any} style={{ flex: 1 }}>
        {msgs.map((m) => (
          <View
            key={m.id}
            style={[styles.bubble, m.role === "user" ? styles.user : styles.bot]}
          >
            <Text style={styles.role}>{m.role.toUpperCase()}</Text>
            {!!m.text && <Text style={styles.txt}>{m.text}</Text>}

            {!!m.attachments?.length && (
              <View style={styles.thumbs}>
                {m.attachments.map((a, i) => (
                  <Image
                    key={`${m.id}-${i}`}
                    source={{ uri: a.uri }}
                    style={styles.thumb}
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {!!attachments.length && (
        <View style={styles.thumbs}>
          {attachments.map((a, i) => (
            <Image key={`draft-${i}`} source={{ uri: a.uri }} style={styles.thumb} />
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={attach}>
          <Text style={styles.btnText}>+ Photo</Text>
        </Pressable>

        <TextInput
          style={[styles.input, { minWidth: 220 }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about your grow…"
        />

        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={send}>
          <Text style={[styles.btnText, styles.btnTextPrimary]}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}
