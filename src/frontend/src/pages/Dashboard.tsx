import {
  CalendarCheck,
  Clock,
  Factory,
  IndianRupee,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { getDashboardStats } from "../store";
import { formatDate, formatINR, todayISO } from "../utils/exportExcel";

export default function Dashboard() {
  const stats = useMemo(() => getDashboardStats(), []);
  const today = todayISO();

  const cards = [
    {
      label: "Total Employees",
      value: String(stats.totalEmployees),
      sub: `${stats.activeEmployees} active`,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Today's Attendance",
      value: String(stats.todayAttendancePresent),
      sub: "present today",
      icon: CalendarCheck,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Today's Production",
      value: formatINR(stats.todayProductionTotal),
      sub: "earnings today",
      icon: TrendingUp,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Monthly Total",
      value: formatINR(stats.currentMonthProductionTotal),
      sub: "this month",
      icon: IndianRupee,
      color: "text-chart-5",
      bg: "bg-chart-5/10",
    },
  ];

  return (
    <div data-ocid="dashboard.section" className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            {formatDate(today)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Factory className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="stat-card"
            >
              <div
                className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}
              >
                <Icon className={`w-4.5 h-4.5 ${card.color}`} strokeWidth={2} />
              </div>
              <div className="text-lg font-display font-bold text-foreground leading-tight">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {card.sub}
              </div>
              <div className="text-xs font-medium text-foreground/70 mt-1">
                {card.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick info */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Mark today's attendance
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Enter production data
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Generate salary sheet
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Export reports
          </div>
        </div>
      </div>
    </div>
  );
}
