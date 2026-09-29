# Admin Dashboard

## Overview

The Admin Dashboard provides administrators with a high-level overview of the SmartPack platform. It presents summarized statistics for users and SmartPacks using dashboard summary cards.

The dashboard retrieves its data from the admin general analysis API when the page is mounted.

## Features

- Displays total user count.
- Displays customer user count.
- Displays internal user count.
- Displays total SmartPack count.
- Displays assigned SmartPack count.
- Displays unassigned SmartPack count.
- Shows a loading state while analysis data is being retrieved.
- Displays an error notification when the analysis request fails.

## Analysis Summary

### User Analysis

The dashboard displays the following user statistics:

| Metric | Description |
| --- | --- |
| Total Users | Total number of users registered on the platform. |
| Customers | Total number of customer accounts. |
| Internal Users | Total number of internal users. |

### SmartPack Analysis

The dashboard displays the following SmartPack statistics:

| Metric | Description |
| --- | --- |
| Total SmartPacks | Total number of SmartPacks registered in the system. |
| Assigned | Number of SmartPacks currently assigned to users. |
| Unassigned | Number of SmartPacks that are not assigned to a user. |

## API Integration

The dashboard uses the admin general analysis endpoint:

```http
GET /api/v1/core/analysis/admin-general/
