import React from "react";
export default function Hoisting() {
  // Hoisting demonstration
  console.log(hoistedVar);
  var hoistedVar = "I am hoisted";
  hoistedFunction();
  function hoistedFunction() { console.log("Hoisted function"); }
  return <div>Hoisting</div>;
}