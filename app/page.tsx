"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface RsiData {
  token_address: string;
  token_name: string;
  rsi: number;
  current_price: number;
  timestamp: string;
}

interface ChartDataPoint {
  time: string;
  price: number;
  rsi: number;
}

export default function Dashboard() {
  const [selectedToken, setSelectedToken] = useState<string>("TokenA");
  const [tokenData, setTokenData] = useState<{
    [key: string]: ChartDataPoint[];
  }>({});
  const [latestData, setLatestData] = useState<{ [key: string]: RsiData }>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");

    eventSource.onopen = () => {
      console.log("✅ Connected to stream");
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: RsiData = JSON.parse(event.data);

        // Update latest data
        setLatestData((prev) => ({
          ...prev,
          [data.token_name]: data,
        }));

        // Update chart data
        setTokenData((prev) => {
          const tokenHistory = prev[data.token_name] || [];
          const newPoint: ChartDataPoint = {
            time: new Date(data.timestamp).toLocaleTimeString(),
            price: data.current_price,
            rsi: data.rsi,
          };

          // Keep last 20 data points
          const updatedHistory = [...tokenHistory, newPoint].slice(-20);

          return {
            ...prev,
            [data.token_name]: updatedHistory,
          };
        });
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    eventSource.onerror = () => {
      console.error("❌ Stream connection error");
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const currentTokenData = tokenData[selectedToken] || [];
  const currentLatest = latestData[selectedToken];
  const availableTokens = Object.keys(latestData);

  const getRsiStatus = (rsi: number) => {
    if (rsi > 70)
      return { text: "OVERBOUGHT", color: "text-red-600", bg: "bg-red-100" };
    if (rsi < 30)
      return { text: "OVERSOLD", color: "text-green-600", bg: "bg-green-100" };
    return { text: "NEUTRAL", color: "text-blue-600", bg: "bg-blue-100" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Trading Analytics Dashboard
          </h1>
          <p className="text-gray-400">
            Real-time RSI monitoring for Solana tokens
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            ></div>
            <span className="text-sm text-gray-400">
              {isConnected ? "Connected to stream" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Token Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Select Token
          </label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          >
            {availableTokens.length > 0 ? (
              availableTokens.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))
            ) : (
              <option value="TokenA">Waiting for data...</option>
            )}
          </select>
        </div>

        {/* Current Values */}
        {currentLatest && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Current Price
              </h3>
              <p className="text-3xl font-bold text-blue-400">
                {currentLatest.current_price.toFixed(6)} SOL
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                RSI (14)
              </h3>
              <p className="text-3xl font-bold text-purple-400">
                {currentLatest.rsi.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Market Status
              </h3>
              <div
                className={`inline-block px-4 py-2 rounded-lg ${
                  getRsiStatus(currentLatest.rsi).bg
                } mt-1`}
              >
                <p
                  className={`text-xl font-bold ${
                    getRsiStatus(currentLatest.rsi).color
                  }`}
                >
                  {getRsiStatus(currentLatest.rsi).text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Price Chart */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Price Movement</h2>
          {currentTokenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentTokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Price (SOL)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Waiting for data...
            </div>
          )}
        </div>

        {/* RSI Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">RSI Indicator</h2>
          {currentTokenData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentTokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis domain={[0, 100]} stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#9CA3AF" }}
                />
                <Legend />
                <ReferenceLine
                  y={70}
                  stroke="#EF4444"
                  strokeDasharray="3 3"
                  label="Overbought"
                />
                <ReferenceLine
                  y={30}
                  stroke="#10B981"
                  strokeDasharray="3 3"
                  label="Oversold"
                />
                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={false}
                  name="RSI"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Waiting for data...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
