/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useContext } from "react";
import { observer } from "mobx-react";
import type { ChartDataSets } from "../chart";
import { BarChart, memoryOptions } from "../chart";
import { isMetricsEmpty, normalizeMetrics } from "../../../common/k8s-api/endpoints/metrics.api";
import { NoMetrics } from "../resource-metrics/no-metrics";
import { ResourceMetricsContext } from "../resource-metrics";
import type { ThemeStore } from "../../themes/store";
import { withInjectables } from "@ogre-tools/injectable-react";
import themeStoreInjectable from "../../themes/store.injectable";

export interface VolumeClaimDiskChartProps {}

interface Dependencies {
  themeStore: ThemeStore;
}

const NonInjectedVolumeClaimDiskChart = observer(({
  themeStore,
}: Dependencies & VolumeClaimDiskChartProps) => {
  const { metrics, tab, object } = useContext(ResourceMetricsContext) ?? {};

  if (!metrics || !object || !tab) return null;
  if (isMetricsEmpty(metrics)) return <NoMetrics/>;

  const id = object.getId();
  const { chartCapacityColor } = themeStore.activeTheme.colors;
  const { diskUsage, diskCapacity } = metrics;
  const usage = normalizeMetrics(diskUsage).data.result[0].values;
  const capacity = normalizeMetrics(diskCapacity).data.result[0].values;

  const datasets: ChartDataSets[] = [
    {
      id: `${id}-diskUsage`,
      label: `Usage`,
      tooltip: `Volume disk usage`,
      borderColor: "#ffc63d",
      data: usage.map(([x, y]) => ({ x, y })),
    },
    {
      id: `${id}-diskCapacity`,
      label: `Capacity`,
      tooltip: `Volume disk capacity`,
      borderColor: chartCapacityColor,
      data: capacity.map(([x, y]) => ({ x, y })),
    },
  ];

  return (
    <BarChart
      className="VolumeClaimDiskChart flex box grow column"
      name={`pvc-${object.getName()}-disk`}
      timeLabelStep={10}
      options={memoryOptions}
      data={{ datasets }}
    />
  );
});

export const VolumeClaimDiskChart = withInjectables<Dependencies, VolumeClaimDiskChartProps>(NonInjectedVolumeClaimDiskChart, {
  getProps: (di, props) => ({
    ...props,
    themeStore: di.inject(themeStoreInjectable),
  }),
});
