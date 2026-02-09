import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { InlineError } from "@/components/InlineError";

type Props = {
  growId: string | null;
  roomId: string | null;
  notes: string;
  mediaLabel: string | null;

  onChangeGrowId: (v: string | null) => void;
  onChangeRoomId: (v: string | null) => void;
  onChangeNotes: (v: string) => void;
  onPickPhoto: () => void;

  error?: any | null;
};

export function AiContextBlock(props: Props) {
  const {
    growId,
    roomId,
    notes,
    mediaLabel,
    onChangeGrowId,
    onChangeRoomId,
    onChangeNotes,
    onPickPhoto,
    error
  } = props;

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "900" }}>Context</Text>

      {error ? (
        <InlineError
          title={error.title || "Context error"}
          message={error.message}
          requestId={error.requestId}
        />
      ) : null}

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Grow</Text>
        <TouchableOpacity
          onPress={() => onChangeGrowId(growId ? null : "GROW_STUB")}
          style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
        >
          <Text style={{ fontWeight: "900" }}>
            {growId ? `Selected: ${growId}` : "Select grow (stub)"}
          </Text>
          <Text style={{ opacity: 0.7, marginTop: 2 }}>
            Step 2B wires real grow dropdown.
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Room</Text>
        <TouchableOpacity
          onPress={() => onChangeRoomId(roomId ? null : "ROOM_STUB")}
          style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
        >
          <Text style={{ fontWeight: "900" }}>
            {roomId ? `Selected: ${roomId}` : "Select room (stub)"}
          </Text>
          <Text style={{ opacity: 0.7, marginTop: 2 }}>
            Step 2B wires real room dropdown.
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Photo</Text>
        <TouchableOpacity
          onPress={onPickPhoto}
          style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
        >
          <Text style={{ fontWeight: "900" }}>
            {mediaLabel ? `Attached: ${mediaLabel}` : "Upload photo (stub picker)"}
          </Text>
          <Text style={{ opacity: 0.7, marginTop: 2 }}>
            Step 2B wires real upload → mediaId.
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={onChangeNotes}
          placeholder="Optional notes (what you’re seeing, goals, constraints)…"
          multiline
          style={{
            borderWidth: 1,
            borderRadius: 10,
            padding: 10,
            minHeight: 80,
            textAlignVertical: "top"
          }}
        />
      </View>
    </View>
  );
}
