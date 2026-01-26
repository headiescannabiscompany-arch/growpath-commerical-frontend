// ARCHIVED: Legacy navigator, replaced by Expo Router. Do not use.
export default function MainTabs() {
  return null;
}
      >
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { capabilities: rawCapabilities } = useAuth();
  // Always default capabilities to an empty object for safety
  const capabilities = rawCapabilities || {};
  // Map tab config to actual screen components
  const tabScreens = {
    DashboardScreen,
    GrowLogsScreen,
    GrowLogCalendarScreen,
    DiagnoseScreen,
    ForumScreen,
    SearchScreen,
    ProfileScreen,
    CoursesScreen,
    DebugScreen,
    FeedScreen
  };
  let filteredTabs = TAB_CONFIG.filter(
    (tab) => canAccess(tab.requiredCaps, capabilities) && (!tab.devOnly || __DEV__)
  );
  if (!filteredTabs.length) {
    filteredTabs.push({
      key: "DebugTab",
      label: "Debug",
      icon: "🛠️",
      routeName: "DebugTab",
      requiredCaps: [],
      component: "DebugScreen"
    });
  }
  console.log(
    "[MainTabs] tabs:",
    filteredTabs.map((t) => t.label),
    "caps:",
    capabilities
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => <View style={styles.tabBg} />
        }}
      >
        {filteredTabs.map((tab) => (
          <Tab.Screen
            key={tab.key}
            name={tab.routeName}
            component={tabScreens[tab.component]}
            options={{
              title: tab.label,
              tabBarLabel: ({ focused }) => (
                <TabIcon
                  label={tab.label}
                  focused={focused}
                  testID={`tab-${tab.key.toLowerCase()}`}
                />
              )
            }}
          />
        ))}
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default MainTabs;
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.card + 4,
    height: 75,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: "transparent",
    paddingBottom: 8
  },
  tabBg: {
    flex: 1,
    backgroundColor: colors.tabBg,
    borderRadius: radius.card + 4,
    boxShadow: "0px 8px 32px rgba(0,0,0,0.12)",
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: "transparent",
    minWidth: 70,
    maxWidth: 140,
    flexShrink: 1
  },
  iconWrapActive: {
    backgroundColor: colors.accent,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
    elevation: 4
  },
  iconEmoji: {
    fontSize: 20,
    marginRight: spacing(0.5)
  },
  iconLabel: {
    fontSize: 10,
    color: colors.tabIcon,
    fontWeight: "500",
    flexShrink: 1
  },
  iconLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
