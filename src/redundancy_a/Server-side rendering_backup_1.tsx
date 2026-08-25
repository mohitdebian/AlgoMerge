import React from "react";
// Next.js getServerSideProps for Server-side rendering (SSR)
export async function getServerSideProps() {
  return { props: { data: "server rendered" } };
}
export default function SSRPage({ data }: any) { return <div>{data}</div>; }
