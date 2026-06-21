import { describe, it, expect, beforeEach } from "vitest";
import { useCart } from "./cart";

const EV = "event-1";
const baseItem = {
  eventProductId: "ep-1",
  productId: "p-1",
  name: "Conjunto Lorena",
  price: 199,
  qty: 1,
  maxQty: 5,
};

describe("useCart — variations & stock", () => {
  beforeEach(() => {
    localStorage.clear();
    useCart.setState({ items: {} });
  });

  it("treats different variants of the same product as separate cart lines", () => {
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red", variantLabel: "Vermelho · M" });
    useCart.getState().add(EV, { ...baseItem, variantId: "v-black", variantLabel: "Preto · M" });
    const list = useCart.getState().items[EV];
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.variantId).sort()).toEqual(["v-black", "v-red"]);
  });

  it("merges quantity when the same variant is added again (capped by maxQty)", () => {
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red", qty: 2, maxQty: 3 });
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red", qty: 5, maxQty: 3 });
    const line = useCart.getState().items[EV].find((i) => i.variantId === "v-red")!;
    expect(line.qty).toBe(3); // capped at maxQty (stock)
  });

  it("setQty / remove operate per (eventProduct, variant) key", () => {
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red" });
    useCart.getState().add(EV, { ...baseItem, variantId: "v-black" });
    useCart.getState().setQty(EV, "ep-1", 4, "v-red");
    expect(useCart.getState().items[EV].find((i) => i.variantId === "v-red")!.qty).toBe(4);
    expect(useCart.getState().items[EV].find((i) => i.variantId === "v-black")!.qty).toBe(1);

    useCart.getState().remove(EV, "ep-1", "v-red");
    expect(useCart.getState().items[EV]).toHaveLength(1);
    expect(useCart.getState().items[EV][0].variantId).toBe("v-black");
  });

  it("clamps qty between 1 and maxQty (stock)", () => {
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red", maxQty: 2 });
    useCart.getState().setQty(EV, "ep-1", 99, "v-red");
    expect(useCart.getState().items[EV][0].qty).toBe(2);
    useCart.getState().setQty(EV, "ep-1", 0, "v-red");
    expect(useCart.getState().items[EV][0].qty).toBe(1);
  });

  it("clear() empties only the targeted event's cart", () => {
    useCart.getState().add(EV, { ...baseItem, variantId: "v-red" });
    useCart.getState().add("event-2", { ...baseItem, variantId: "v-red" });
    useCart.getState().clear(EV);
    expect(useCart.getState().items[EV]).toBeUndefined();
    expect(useCart.getState().items["event-2"]).toHaveLength(1);
  });
});
