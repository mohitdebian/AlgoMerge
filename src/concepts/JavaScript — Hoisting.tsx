import React, { useEffect } from "react";

export default function Hoisting() {
  useEffect(() => {
    // 1. Variable Hoisting (var)
    console.log("var before initialization:", hoistedVar); // Outputs: undefined
    var hoistedVar = "I am hoisted";

    // 2. Function Hoisting
    hoistedFunction(); // Outputs: "Hoisted function runs!"
    function hoistedFunction() {
      console.log("Hoisted function runs!");
    }

    // 3. Temporal Dead Zone (let/const)
    // console.log(nonHoistedVar); // Would throw a ReferenceError!
    let nonHoistedVar = "I am in the Temporal Dead Zone";
  }, []);

  return <div>Check console for Hoisting demo</div>;
}