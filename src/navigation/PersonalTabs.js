// ARCHIVED: Legacy navigator, replaced by Expo Router. Do not use.
export default function PersonalTabs() {
  return null;
}
          component={page.component}
          options={{
            tabBarIcon: page.icon
              ? ({ color, size }) => renderIonicon(page.icon, color, size)
              : () => null,
            tabBarLabel: page.label,
            title: page.label
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
