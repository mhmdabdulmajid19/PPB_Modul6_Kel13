import { useCallback, useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useMqttSensor } from "../hooks/useMqttSensor.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { Api } from "../services/api.js";
import { DataTable } from "../components/DataTable.js";
import { SafeAreaView } from "react-native-safe-area-context";

export function MonitoringScreen() {
  const { temperature, timestamp, connectionState, error: mqttError } = useMqttSensor();
  const { sendLocalNotification, expoPushToken } = useNotifications();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentThreshold, setCurrentThreshold] = useState(null);
  
  const previousTemperature = useRef(null);

  // Fetch threshold saat ini
  const fetchCurrentThreshold = useCallback(async () => {
    try {
      const thresholds = await Api.getThresholds();
      if (thresholds && thresholds.length > 0) {
        setCurrentThreshold(thresholds[0].value);
      }
    } catch (err) {
      console.error("Failed to fetch threshold:", err);
    }
  }, []);

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await Api.getSensorReadings();
      setReadings(data ?? []);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReadings();
      fetchCurrentThreshold();
    }, [fetchReadings, fetchCurrentThreshold])
  );

  // Monitor perubahan temperature dan kirim notifikasi
  useEffect(() => {
    if (
      notificationsEnabled &&
      temperature !== null &&
      previousTemperature.current !== temperature
    ) {
      // Notifikasi untuk setiap data baru
      sendLocalNotification(
        "📊 Temperature Update",
        `New reading: ${temperature.toFixed(2)}°C`,
        { temperature, timestamp }
      );

      // Notifikasi khusus jika melebihi threshold
      if (currentThreshold !== null && temperature > currentThreshold) {
        sendLocalNotification(
          "🚨 Temperature Alert!",
          `Temperature ${temperature.toFixed(2)}°C exceeded threshold ${currentThreshold.toFixed(2)}°C`,
          { 
            temperature, 
            threshold: currentThreshold,
            timestamp,
            alert: true 
          }
        );
      }

      previousTemperature.current = temperature;
    }
  }, [temperature, notificationsEnabled, currentThreshold, sendLocalNotification, timestamp]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchReadings();
      await fetchCurrentThreshold();
    } finally {
      setRefreshing(false);
    }
  }, [fetchReadings, fetchCurrentThreshold]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Realtime Temperature</Text>
            <View style={styles.notificationToggle}>
              <Text style={styles.toggleLabel}>🔔</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#d0d0d0", true: "#2563eb" }}
                thumbColor={notificationsEnabled ? "#fff" : "#f4f4f4"}
              />
            </View>
          </View>
          
          <View style={styles.valueRow}>
            <Text style={styles.temperatureText}>
              {typeof temperature === "number" ? `${temperature.toFixed(2)}°C` : "--"}
            </Text>
          </View>
          
          {currentThreshold !== null && (
            <View style={styles.thresholdInfo}>
              <Text style={styles.thresholdText}>
                Threshold: {currentThreshold.toFixed(2)}°C
              </Text>
              {temperature !== null && temperature > currentThreshold && (
                <Text style={styles.alertText}>⚠️ Above Threshold!</Text>
              )}
            </View>
          )}
          
          <Text style={styles.metaText}>MQTT status: {connectionState}</Text>
          {timestamp && (
            <Text style={styles.metaText}>
              Last update: {new Date(timestamp).toLocaleString()}
            </Text>
          )}
          {mqttError && <Text style={styles.errorText}>MQTT error: {mqttError}</Text>}
          
          {expoPushToken && (
            <Text style={styles.tokenText}>
              Push Token: {expoPushToken.substring(0, 20)}...
            </Text>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Triggered Readings History</Text>
          {loading && <ActivityIndicator />}
        </View>
        {apiError && <Text style={styles.errorText}>Failed to load history: {apiError}</Text>}
        <DataTable
          columns={[
            {
              key: "recorded_at",
              title: "Timestamp",
              render: (value) => (value ? new Date(value).toLocaleString() : "--"),
            },
            {
              key: "temperature",
              title: "Temperature (°C)",
              render: (value) =>
                typeof value === "number" ? `${Number(value).toFixed(2)}` : "--",
            },
            {
              key: "threshold_value",
              title: "Threshold (°C)",
              render: (value) =>
                typeof value === "number" ? `${Number(value).toFixed(2)}` : "--",
            },
          ]}
          data={readings}
          keyExtractor={(item) => item.id}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fb",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  notificationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    fontSize: 16,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  temperatureText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#ff7a59",
  },
  thresholdInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
  },
  thresholdText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  alertText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
  },
  metaText: {
    marginTop: 8,
    color: "#555",
  },
  tokenText: {
    marginTop: 8,
    fontSize: 10,
    color: "#999",
  },
  errorText: {
    marginTop: 8,
    color: "#c82333",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
});