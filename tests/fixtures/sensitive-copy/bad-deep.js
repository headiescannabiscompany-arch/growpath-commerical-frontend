import React from "react";
import { View, Text } from "react-native";

const Wrapper = ({ children }) => <View>{children}</View>;

export function BadDeep() {
  return (
    <View>
      <Wrapper>
        <Wrapper>
          <Text>Marijuana mastery tips</Text>
        </Wrapper>
      </Wrapper>
    </View>
  );
}

export default BadDeep;
