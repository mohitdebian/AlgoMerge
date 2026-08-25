import React, { useEffect } from "react";
export default function PromisesVsCallbacks() {
  useEffect(() => {
    // Callback
    setTimeout(() => { console.log("callback done"); }, 1000);
    // Promise
    fetch("/").then(res => res.json()).then(data => console.log(data));
  }, []);
  return <div>Promises vs Callbacks</div>;
}