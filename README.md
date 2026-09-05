# Hendai AI - WhatsApp B2B Server

## Introduction
The **Hendai AI Server** is the intelligent core of a B2B communication system designed to bridge the gap between suppliers and retail companies via WhatsApp. Built with TypeScript, this server utilizes AI (Google Gemini) to process natural language inquiries from retailers, classify their intents, and seamlessly route commands to a secure local client connected to the supplier's database. 

This architecture ensures that the supplier's local database remains 100% secure and isolated, while still providing automated, real-time responses and order processing to their clients.

## Architecture
The system is built on a highly decoupled, real-time architecture:
1. **Webhook Interface:** Receives incoming WhatsApp messages from retailers (`src/http/index.ts`).
2. **AI Processing Engine:** Forwards the message context to Google Gemini (`src/models/gemini.ts`) to analyze the request and determine the exact user intent.
3. **Action Router:** Based on the AI's response, the algorithm (`src/Algos/Algo_Find.ts`) triggers the appropriate action.
4. **WebSocket Communication:** Uses WebSockets (`src/Algos/classAlgo.ts`) to request specific product data or send order details to the Local Data Client residing securely on the supplier's local network.
5. **Database Logging:** Logs chat history and client configurations using MongoDB/Mongoose (`src/DB/chatModel.ts` & `src/DB/clientModel.ts`).

## Key Features
The server is equipped with a dynamic routing system capable of handling the following core B2B operations:

* **🧠 Advanced NLP (Powered by Gemini):** Understands complex, unstructured messages from retailers.
* **📦 Product Inquiries:**
  * `question_about_previous_product`: Retrieves updates or details about previously ordered items.
  * `question_about_new_product`: Checks availability, pricing, and specs for new items via the local client.
  * `global_questions`: Handles general FAQs regarding the supplier's policies or catalog.
* **🛒 Order Management:**
  * `order_question`: Answers queries related to current order status or processing.
  * `order_confirmation`: Implements a **Double Opt-in** system to confirm order details before deducting from the supplier's inventory.
* **🧑‍💻 Human Handoff (`transfer_to_worker`):** Automatically detects complex negotiations or unsupported queries and gracefully transfers the chat to a human sales representative.
* **⚡ Real-Time Socket Communication:** Ensures instant data retrieval from the supplier's local database without exposing their internal network to the internet.

## Installation & Usage

### Prerequisites
* Node.js (v16 or higher)
* MongoDB (for storing chat models and client configurations)
* TypeScript installed globally (optional, for development)

### Setup
1. Clone the repository:
   ```bash
   git clone [https://github.com/YoFi-0/hendai_last_v.git](https://github.com/YoFi-0/hendai_last_v.git)
   cd hendai_last_v
