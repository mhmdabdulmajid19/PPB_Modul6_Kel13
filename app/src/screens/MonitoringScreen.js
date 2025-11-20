import { useCallback, useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMqttSensor } from "../hooks/useMqttSensor.js";
import { useNotifications } from "../hooks/useNotifications.js";
import { Api } from "../services/api.js";
import { DataTable } from "../components/DataTable.js";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEMS_PER_PAGE = 10;

export function MonitoringScreen() {
  const { temperature, timestamp, connectionState, error: mqttError } = useMqttSensor();
  const { sendLocalNotification, expoPushToken } = useNotifications();
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [currentThreshold, setCurrentThreshold] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const previousTemperature = useRef(null);

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
      setTotalPages(Math.ceil((data?.length || 0) / ITEMS_PER_PAGE));
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

  useEffect(() => {
    if (
      notificationsEnabled &&
      temperature !== null &&
      previousTemperature.current !== temperature
    ) {
      sendLocalNotification(
        "📊 Temperature Update",
        `New reading: ${temperature.toFixed(2)}°C`,
        { temperature, timestamp }
      );

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

  // Pagination logic
  const paginatedData = readings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

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
          data={paginatedData}
          keyExtractor={(item) => item.id}
        />

        {/* Pagination Controls */}
        {readings.length > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
              onPress={goToPrevPage}
              disabled={currentPage === 1}
            >
              <Ionicons 
                name="chevron-back" 
                size={20} 
                color={currentPage === 1 ? "#d1d5db" : "#2563eb"} 
              />
              <Text style={[
                styles.paginationButtonText,
                currentPage === 1 && styles.paginationButtonTextDisabled
              ]}>
                Sebelumnya
              </Text>
            </TouchableOpacity>

            <View style={styles.pageInfo}>
              <Text style={styles.pageText}>
                Page {currentPage} of {totalPages}
              </Text>
              <Text style={styles.pageSubtext}>
                {readings.length} total records
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
              onPress={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[
                styles.paginationButtonText,
                currentPage === totalPages && styles.paginationButtonTextDisabled
              ]}>
                Berikutnya
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={currentPage === totalPages ? "#d1d5db" : "#2563eb"} 
              />
            </TouchableOpacity>
          </View>
        )}
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
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  paginationButtonDisabled: {
    borderColor: "#d1d5db",
    opacity: 0.5,
  },
  paginationButtonText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 14,
  },
  paginationButtonTextDisabled: {
    color: "#d1d5db",
  },
  pageInfo: {
    alignItems: "center",
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  pageSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
});