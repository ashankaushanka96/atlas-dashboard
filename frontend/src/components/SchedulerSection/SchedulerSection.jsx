/* SchedulerSection.jsx */
import React, { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import SchedulerFilterBar from "./SchedulerFilterBar";
import SchedulerTable from "./SchedulerTable";
import SchedulerAddTagsModal from "./SchedulerAddTagsModal";
import SchedulerLambdaModal from "./SchedulerLambdaModal";
import { backendDomain } from "../../Config";
import axios from "axios";

const SchedulerSection = () => {
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTokens, setFilterTokens] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [lambdaModalOpen, setLambdaModalOpen] = useState(false);

  const fetchEvents = async (fresh = false) => {
    setLoading(true);
    try {
      const resp = await axios.get(
        `${backendDomain}/schedules/fetch-schedules`,
        { params: { fresh: fresh ? "true" : "false" } }
      );
      setEvents(resp.data.schedules);
    } catch (err) {
      setError(err.response?.data?.error_message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // derive suggestions
  const ipSuggestions = [...new Set(events.map((e) => e.private_ip))];
  const regionSuggestions = [...new Set(events.map((e) => e.region))];
  const executedSuggestions = ["executed", "not_executed"];
  const scheduleEnabledSuggestions = ["enabled", "disabled"];

  // filtering
  const filteredEvents = events.filter((event) => {
    if (!filterTokens.length) return true;
    const grouped = filterTokens.reduce((acc, t) => {
      (acc[t.key] || (acc[t.key] = [])).push(t);
      return acc;
    }, {});
    return Object.entries(grouped).every(([key, tokens]) => {
      const values = tokens.map((t) => t.value.toLowerCase());
      const op = tokens[0].operator;
      let prop = "";
      switch (key) {
        case "ip":
          prop = event.private_ip.toLowerCase();
          break;
        case "region":
          prop = event.region.toLowerCase();
          break;
        case "executed":
          const dyn = new Date(event.scheduled_time) <= now;
          prop = dyn ? "executed" : "not_executed";
          break;
        case "schedule_enabled":
          prop = event.schedule_enabled ? "enabled" : "disabled";
          break;
        default:
          return true;
      }
      return op === "AND"
        ? values.every((v) => prop.includes(v))
        : values.some((v) => prop.includes(v));
    });
  });

  return (
    <Box sx={{ p: 2 }} overflow="hidden">
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6">Scheduled EC2 Events</Typography>
      </Box>
      <SchedulerFilterBar
        onFilterTokensChange={setFilterTokens}
        ipSuggestions={ipSuggestions}
        executedSuggestions={executedSuggestions}
        scheduleEnabledSuggestions={scheduleEnabledSuggestions}
        regionSuggestions={regionSuggestions}
        onRefresh={() => fetchEvents(true)}
        loading={loading}
        onOpenModal={() => setModalOpen(true)}
        onOpenLambda={() => setLambdaModalOpen(true)}
      />
      <SchedulerTable
        events={filteredEvents}
        now={now}
        loading={loading}
        error={error}
      />
      <SchedulerAddTagsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <SchedulerLambdaModal
        open={lambdaModalOpen}
        onClose={() => setLambdaModalOpen(false)}
      />
    </Box>
  );
};

export default SchedulerSection;
