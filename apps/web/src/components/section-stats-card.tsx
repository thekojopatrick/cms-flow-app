import React from "react";
import { Badge } from "./ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { IconTrendingUp } from "@tabler/icons-react";

interface SectionStatsCardProps {
  title: string;
  value: string;
  trend: "up" | "down";
  trendValue: string;
  trendIcon: React.ReactNode;
  description: string;
}

const SectionStatsCard = ({
  title,
  value,
  trend,
  trendValue,
  trendIcon,
  description,
}: SectionStatsCardProps) => {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {trendIcon}
            {trendValue}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {trend} {trendIcon}
        </div>
        <div className="text-muted-foreground">{description}</div>
      </CardFooter>
    </Card>
  );
};

export default SectionStatsCard;
