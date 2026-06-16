"use client";
import { Card, Text, tokens } from "@fluentui/react-components";
import { ReOrderDotsVerticalRegular } from "@fluentui/react-icons";
import styles from "./WidgetCard.module.css";

interface Props {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WidgetCard({ title, icon, children, className }: Props) {
  return (
    <Card className={`${styles.card} ${className ?? ""}`}>
      <div className={`${styles.header} widget-drag-handle`}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <Text size={300} weight="semibold" className={styles.title}>{title}</Text>
        <ReOrderDotsVerticalRegular className={styles.dragIcon} />
      </div>
      <div className={styles.body}>{children}</div>
    </Card>
  );
}
