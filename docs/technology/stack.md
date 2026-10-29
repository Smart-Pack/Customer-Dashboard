# Technology Stack

This document describes the technologies and tools used to develop and operate the SmartPack Customer Dashboard.

## Frontend

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Axios      | HTTP client for API communication          |
| jwt-decode | — Decodes JSON Web Tokens (JWTs) to access their payload claims |
| Vue        | Frontend framework                         |
| TypeScript | Type-safe programming language             |
| Vite       | Frontend build tool and development server |
| Pinia      | State management                           |
| Tailwind CSS | Utility-first CSS framework |
| @tailwindcss/vite | Tailwind CSS integration for Vite |
| SweetAlert2 | — Alert, toast, and confirmation notifications |
| Vue Router | Client-side routing                        |
| VeeValidate | — Form validation and field state management |
| Vue3 ApexCharts | — Vue 3 charting library for interactive data visualization and sensor measurement charts |
| @vee-validate/rules | — Built-in validation rules for VeeValidate |
| mqtt | MQTT client for JavaScript, enabling real-time messaging between your Vue frontend and an MQTT broker over WebSockets.
| Vue Tel Input | — International telephone number input with country selection and formatting |
| QRCode Vue 3 | `qrcode-vue3` | Vue 3 QR code generation component for displaying device/user QR codes |
| `vue3-google-signin` | Vue 3 Google Sign-In integration using Google Identity Services ([Guide](https://vue3-google-signin.wavezync.com/guide/)) |
| `vue-qrcode-reader` | Vue 3 QR code reader with camera scanning and image/file QR code detection ([Guide](https://www.npmjs.com/package/vue-qrcode-reader)) |


## Mobile Development

| Technology | Purpose |
| ---------- | ------- |
| Capacitor | Native runtime for packaging the Vue application as an Android mobile app while reusing the existing web codebase. |
| `@capacitor/core` | Core Capacitor runtime APIs for communication between the web application and native platform functionality. |
| `@capacitor/android` | Android platform integration for building and running the application on Android devices. |
| `@capacitor/cli` | Command-line tooling for initializing Capacitor, synchronizing web assets and plugins, and managing native platform projects. |
| `bluetooth-serial` | Bluetooth Classic serial communication between the Android application and ESP32-based SmartPack devices, including device discovery, connection, and data exchange. |

## Testing

| Tool           | Purpose                                  |
| -------------- | ---------------------------------------- |
| Vitest         | Unit and component testing               |
| Vue Test Utils | Vue component testing utilities          |
| jsdom          | Browser environment simulation for tests |

## Code Quality and Development Tools

| Tool                            | Purpose                                      |
| ------------------------------- | -------------------------------------------- |
| ESLint                          | Code linting                                 |
| Prettier                        | Code formatting                              |
| Oxlint                          | Fast JavaScript and TypeScript linting       |
| vue-tsc                         | Type checking for Vue and TypeScript         |
| `@vue/eslint-config-typescript` | ESLint configuration for TypeScript and Vue  |
| `eslint-plugin-vue`             | ESLint rules for Vue                         |
| `eslint-config-prettier`        | Prevents ESLint and Prettier rule conflicts  |
| pre-commit                      | Automated Git hooks for local quality checks |
| Git                             | Version control                              |
| GitHub                          | Repository and collaboration                 |
| Husky | Git hooks for automated pre-commit and pre-push quality checks |

## Development Environment

| Tool    | Purpose                             |
| ------- | ----------------------------------- |
| Node.js | JavaScript runtime                  |
| `pnpm`  | Package and dependency management   |
| VS Code | Recommended development environment |

## Deployment

| Technology | Purpose                                    |
| ---------- | ------------------------------------------ |
| Vercel     | Frontend hosting and continuous deployment |

## Planned Tools

Tools that are planned but not yet implemented should be documented separately or marked clearly as planned.

