# Python script to simulate multi-tier Light dice under two models:
# Model 1: All Light dice grouped into ONE source pool
# Model 2: Each Star Level of Light dice acts as an INDEPENDENT source pool

def get_light_pct(star, pu_lvl=5, rune_pct=0.0):
    # base 6% + (star-1)*3% + (pu_lvl-1)*1% + rune
    return 0.06 + (star - 1) * 0.03 + (pu_lvl - 1) * 0.01 + rune_pct

t_base = 0.26 # 2.7 raw, PU -0.88, 7-dot -> 0.26s

print("=== Single Light Dice Values (PU Lv 5) ===")
star_values = {}
for s in range(1, 8):
    pct = get_light_pct(s)
    star_values[s] = pct
    print(f"  {s}-Star Light: {pct*100:.1f}%")

# Case 1: Five 7-Star Light Dice
print("\n--- CASE 1: Five 7-Star Light Dice (7+7+7+7+7) ---")
total_pct_5x7 = 5 * star_values[7]
# Under Model 1 (single pool):
red_5x7_m1 = t_base * (total_pct_5x7 / (1.0 + total_pct_5x7))
print(f"Total %: {total_pct_5x7*100:.1f}%")
print(f"Model 1 (Single Pool) reduction: {red_5x7_m1:.5f}s -> Final: {t_base - red_5x7_m1:.5f}s")
# Under Model 2 (each tier separate): Since all are 7-star, they are in the same tier 7 pool, so result is identical!
red_5x7_m2 = t_base * (total_pct_5x7 / (1.0 + total_pct_5x7))
print(f"Model 2 (Separate Tiers) reduction: {red_5x7_m2:.5f}s -> Final: {t_base - red_5x7_m2:.5f}s")

# Case 2: One of each star level (1+2+3+4+5+6+7)
print("\n--- CASE 2: One of each star (1+2+3+4+5+6+7) ---")
total_pct_1to7 = sum(star_values.values())
print(f"Total %: {total_pct_1to7*100:.1f}% (Sum of 10% + 13% + 16% + 19% + 22% + 25% + 28%)")

# Under Model 1 (All Light in 1 pool):
red_1to7_m1 = t_base * (total_pct_1to7 / (1.0 + total_pct_1to7))
print(f"Model 1 (All Light in 1 pool) reduction: {red_1to7_m1:.5f}s -> Final: {t_base - red_1to7_m1:.5f}s")

# Under Model 2 (Each Star level is its OWN independent reduction pool):
red_1to7_m2 = 0
for s in range(1, 8):
    pct = star_values[s]
    delta = t_base * (pct / (1.0 + pct))
    red_1to7_m2 += delta
    print(f"  Star {s} ({pct*100:.1f}%) independent reduction: {delta:.5f}s")

print(f"Model 2 (Each Star Independent) Total reduction: {red_1to7_m2:.5f}s")
print(f"Required reduction to hit 0.01: {t_base - 0.01:.5f}s (= 0.25000s)")
print(f"Model 2 Final interval: {max(0.01, t_base - red_1to7_m2):.5f}s (Overcapped by {red_1to7_m2 - (t_base - 0.01):.5f}s!)")

