# User Dashboard

## Overview

The User Dashboard gives each signed-in user a high-level overview of their groups, SmartPacks, backpack load, and steps. It combines summary cards, donut charts, and two analytics charts (load and steps) that share a SmartPack and date range filter.

Group memberships are read from the authenticated user's profile. SmartPacks and sensor measurements are retrieved from the SmartPack API when the page is mounted, and measurements are fetched again whenever a filter changes.

## Features

- Displays total group memberships.
- Displays admin memberships (owner and admin roles).
- Displays regular member memberships.
- Displays total SmartPack count.
- Displays assigned and unassigned SmartPack counts.
- Shows group role and SmartPack assignment breakdowns as donut charts.
- Shows the average daily backpack load as a line chart.
- Shows daily steps as a bar chart.
- Filters the load and steps analytics by SmartPack and by date range (last 7 or 30 days).
- Shows skeleton loading placeholders while SmartPacks and measurements are being retrieved.
- Displays inline error messages when a SmartPack or measurement request fails.
- Shows empty states when there are no group memberships or SmartPacks.

## Dashboard Summary

### Group Analysis

Group statistics are calculated from the groups on the authenticated user's profile, so no extra request is made.

| Metric | Description |
| --- | --- |
| Group Memberships | Total number of groups the user belongs to. |
| Admin Memberships | Number of groups where the user is an owner or an admin. |
| Regular Member | Number of groups where the user is a member. |

### SmartPack Analysis

A SmartPack is considered assigned when it has a non-empty child name. Empty, whitespace-only, and missing names count as unassigned.

| Metric | Description |
| --- | --- |
| Total SmartPacks | Total number of SmartPacks available to the user. |
| Assigned to Children | Number of SmartPacks with a child assigned. |
| Unassigned | Number of SmartPacks with no child assigned. |

### Backpack Load Analysis

| Metric | Description |
| --- | --- |
| Average Daily Load | Mean of the daily average load, in kilograms, across days that have measurements. |
| Measurements Recorded | Number of sensor measurements returned for the selected SmartPack(s) and date range. |

### Steps Analysis

| Metric | Description |
| --- | --- |
| Total Steps | Sum of daily steps across the selected date range. |
| Average Steps per Active Day | Total steps divided by the number of days with at least one step. |

## Filters

The SmartPack and date range filters apply to both the load and steps sections.

| Filter | Options | Default |
| --- | --- | --- |
| SmartPack | All SmartPacks, or a single SmartPack (labelled by child name, falling back to IMEI) | All SmartPacks |
| Date range | Last 7 days, Last 30 days | Last 7 days |

The SmartPack selector is disabled while SmartPacks are loading. The date range runs from midnight on the first day to the end of today, in the user's local time.

## Calculations

### Backpack load

- Sensor weights are stored in grams and converted to kilograms for display.
- Measurements are grouped by local calendar day and averaged.
- Days without measurements appear as zero on the chart and are excluded from the "Average Daily Load" figure.
- Negative, non-numeric, or undated measurements are ignored.

### Steps

- Steps are a cumulative counter, so daily steps are calculated from the difference between consecutive readings.
- Readings are calculated separately for each SmartPack and sorted by time first.
- Each difference is attributed to the day of the later reading, so a pair of readings that crosses midnight counts toward the new day.
- Decreases in the counter (for example, after a reset) are ignored.
- Readings with invalid steps or timestamps are skipped.

## Loading and Error States

| Situation | Behavior |
| --- | --- |
| SmartPacks loading | Skeleton placeholders in the SmartPack cards and assignment section; SmartPack selector disabled. |
| Measurements loading | Skeleton placeholders in the load and steps stat cards and charts. |
| SmartPack request fails | "Unable to load SmartPacks. Please try again." is shown, and measurements are not requested. |
| Measurement request fails | "Unable to load sensor measurements. Please try again." is shown in both analytics sections. The error clears on the next successful load. |
| No group memberships | "No group memberships available" replaces the donut chart. |
| No SmartPacks | "No SmartPacks available" replaces the donut chart. |

Group membership figures do not depend on SmartPack loading, so they remain visible while SmartPacks load.

## API Integration

The dashboard uses the SmartPack API client and the auth store:

| Source | Used for |
| --- | --- |
| `authStore.loggedInUser.groups` | Group memberships and roles. |
| `api.smartpacks.list({ page })` | SmartPacks available to the user. |
| `api.smartpacks.listSensorMeasurements(params)` | Weight and step measurements. |
| `getStepsDelta(current, previous)` | Step difference between two consecutive readings. |

List endpoints are paginated, and the dashboard requests every page until `next` is empty.

Measurement requests are made once per SmartPack (or only for the selected SmartPack) with these parameters:

| Parameter | Description |
| --- | --- |
| `page` | Page number, starting at 1. |
| `smartpack` | ID of the SmartPack. |
| `timestamp_gte` | Start of the selected date range, as an ISO timestamp. |
| `timestamp_lte` | End of the selected date range, as an ISO timestamp. |

The API does not return the SmartPack ID on each measurement, so the dashboard tags each measurement with the SmartPack it was fetched for.

## Testing

Unit tests are in `HomeView.spec.ts` and run with Vitest. They mock the auth store, the SmartPack API, `getStepsDelta`, and the chart component, and fake the system date so date ranges are deterministic. They cover:

- Rendering of sections, icons, and charts.
- Group role counts and empty states.
- SmartPack pagination, assignment counts, and loading and error states.
- Filter behavior and measurement refetching.
- Load averaging, unit conversion, and invalid data handling.
- Step differences, sorting, midnight crossings, counter resets, and per-SmartPack calculation.
