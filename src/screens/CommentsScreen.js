import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getComments, addComment } from "../api/posts";

export default function CommentsScreen({ route }) {
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  async function load() {
    const res = await getComments(postId);
    setComments(res.data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!text.trim()) return;
    await addComment(postId, text);
    setText("");
    load();
  }

  return (
    <ScreenContainer>
      <FlatList
        data={comments}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <View style={{ padding: 10, backgroundColor: "white", marginBottom: 8, borderRadius: 8 }}>
            <Text style={{ fontWeight: "700" }}>{item.user?.username || "User"}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />

      <View style={{ flexDirection: "row", marginTop: 16 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          style={{ flex: 1, backgroundColor: "#eee", padding: 10, borderRadius: 8 }}
          placeholder="Write a comment..."
        />
        <TouchableOpacity style={{ marginLeft: 10, backgroundColor: "#2ecc71", padding: 12, borderRadius: 8 }} onPress={send}>
          <Text style={{ color: "white" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
