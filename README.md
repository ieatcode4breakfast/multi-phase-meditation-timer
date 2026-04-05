# Multi-Phase Meditation Timer

A robust, highly customizable meditation timer built with React, TypeScript, and Vite. This application allows users to create complex meditation routines with varying phases, repetitions, and traditional bell audio cues.

## Features

* **Multi-Phase Sequences:** Create customized meditation sessions broken down into distinct time phases (hours, minutes, seconds).
* **Repeat Functionality:** Easily set specific phases to repeat multiple times within a single session.
* **Audio Cues:** Features traditional meditation bell strikes:
    * 3 strikes at the beginning of the session.
    * 1 strike to signal phase transitions and the end of the session.
* **Adjustable Volume:** Built-in volume slider for the bell strikes.
* **Preparation Countdown:** Optional toggleable countdown before the first phase begins.
* **Persistent Storage:** Automatically saves your configured phases, volume, and countdown preferences to local storage so they are ready for your next session.
* **Wake Lock Integration:** Automatically requests a screen wake lock to prevent your device from going to sleep while the timer is actively running.
* **Session Tracking:** Calculates and displays total session time, remaining time, and any extended time if you sit past the final bell.

## Tech Stack

* **Framework:** React 19
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Language:** TypeScript
* **Icons:** Lucide React

## Getting Started

### Prerequisites
* Node.js installed on your machine.

### Installation

1.  Clone the repository or download the source code.
2.  Navigate to the project directory in your terminal.
3.  Install the project dependencies:
    ```bash
    npm install
    ```

### Running Locally

To start the development server:
```bash
npm run dev