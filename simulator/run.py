import sys
import json
import urllib.request
import urllib.error

# Hardcoded simulation payloads matching our four demo cases
SIMULATIONS = {
    "1": {
        "name": "High CPU Anomaly (checkout-api)",
        "payload": {
            "service_name": "checkout-api",
            "cpu_percent": 96.0,
            "memory_percent": 62.0,
            "error_rate_percent": 0.4,
            "latency_ms": 280.0,
        },
    },
    "2": {
        "name": "Memory Leak Anomaly (inventory-worker)",
        "payload": {
            "service_name": "inventory-worker",
            "cpu_percent": 48.0,
            "memory_percent": 97.0,
            "error_rate_percent": 0.6,
            "latency_ms": 340.0,
        },
    },
    "3": {
        "name": "CrashLoopBackOff Anomaly (payments-api)",
        "payload": {
            "service_name": "payments-api",
            "cpu_percent": 71.0,
            "memory_percent": 76.0,
            "error_rate_percent": 8.4,
            "latency_ms": 950.0,
        },
    },
    "4": {
        "name": "Deployment Failure Anomaly (orders-api)",
        "payload": {
            "service_name": "orders-api",
            "cpu_percent": 84.0,
            "memory_percent": 86.0,
            "error_rate_percent": 4.8,
            "latency_ms": 1420.0,
        },
    },
    "5": {
        "name": "Database Connection Storm (database-storm)",
        "payload": {
            "service_name": "database-storm",
            "cpu_percent": 88.0,
            "memory_percent": 74.0,
            "error_rate_percent": 15.5,
            "latency_ms": 2450.0,
        },
    },
}


def print_menu():
    print("=========================================")
    print("     InfraMedic Incident Simulator       ")
    print("=========================================")
    for key, value in SIMULATIONS.items():
        print(f"[{key}] {value['name']}")
    print("[q] Quit")
    print("=========================================")


def trigger_simulation(choice: str, api_url: str):
    sim = SIMULATIONS.get(choice)
    if not sim:
        print("Invalid choice!")
        return

    print(f"\nTriggering: {sim['name']}...")
    payload_data = json.dumps(sim["payload"]).encode("utf-8")

    req = urllib.request.Request(
        f"{api_url}/api/monitoring/evaluate",
        data=payload_data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body)
            print("\n[Success] Incident Evaluation response received:")
            print(json.dumps(data, indent=2))
            print("\nIncident detected! SRE multi-agent workflow is running in the background.")
    except urllib.error.URLError as e:
        print(f"\n[Error] Failed to connect to server at {api_url}.")
        print("Please check if the FastAPI backend is running.")
        print(f"Details: {e}")


def main():
    api_url = "http://localhost:8000"
    if len(sys.argv) > 1:
        choice = sys.argv[1]
        if choice in SIMULATIONS:
            trigger_simulation(choice, api_url)
            return
        elif choice == "--help" or choice == "-h":
            print("Usage: python simulator/run.py [1|2|3|4]")
            return

    while True:
        print_menu()
        choice = input("Select incident to simulate: ").strip()
        if choice.lower() == "q":
            print("Goodbye!")
            break
        trigger_simulation(choice, api_url)
        print("\nPress Enter to return to menu...")
        input()


if __name__ == "__main__":
    main()
