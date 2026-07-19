"use client";
import { useEffect, useState } from "react";
import CartDrawer from "@/components/CartDrawer";
export default function CartButton(){ const [open,setOpen]=useState(false); const [count,setCount]=useState(0); function update(){ const cart=JSON.parse(localStorage.getItem("lounge_cart")||"[]"); setCount(cart.reduce((s:number,i:any)=>s+i.quantity,0)); } useEffect(()=>{update(); window.addEventListener("lounge-cart",update); return()=>window.removeEventListener("lounge-cart",update);},[]); return <><button className="pill dark-pill" onClick={()=>setOpen(true)}>Saco ({count})</button><CartDrawer open={open} onClose={()=>setOpen(false)}/></>; }

