import React, { useEffect, useState } from "react";

export default function PromisesVsCallbacks() {
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    // 1. Callback approach (Ideal for simple native browser APIs like setTimeout)
    setTimeout(() => { 
      console.log("Timeout callback executed."); 
      
      // 2. Promise approach (Ideal for network requests to avoid deeply nested callback hell)
      fetch("/api/data")
        .then(res => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then(data => {
          setStatus("Data loaded successfully!");
          console.log(data);
        })
        .catch(error => {
          // Explicit Error Handling for Promises
          console.error("Promise rejected:", error);
          setStatus("Failed to load data.");
        });

    }, 1000);
  }, []);

  return <div>Status: {status}</div>;
}