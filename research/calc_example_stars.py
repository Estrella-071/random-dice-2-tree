# Python verification for 4+5+5+6+7 configuration

def calc_light_pct(star, pu_lvl=5, rune_pct=0.0):
    # base 6% + (star-1)*3% + (pu_lvl-1)*1% + rune
    return 0.06 + (star - 1) * 0.03 + (pu_lvl - 1) * 0.01 + rune_pct

stars_input = [4, 5, 5, 6, 7]
# deduplicate unique stars
unique_stars = sorted(list(set(stars_input)))
print("Input stars:", stars_input)
print("Effective unique stars after deduplication:", unique_stars)

pct_list = [calc_light_pct(s) for s in unique_stars]
for s, p in zip(unique_stars, pct_list):
    print(f"  {s} Star Light -> {p*100:.1f}%")

total_light_pct = sum(pct_list)
print(f"Total Light Pool % (Sigma%_Light): {total_light_pct*100:.1f}%")

# Base calculation (2.7 - 0.88)/7 = 0.26
t_base = 0.26
delta_t_light = t_base * (total_light_pct / (1.0 + total_light_pct))
print(f"Delta T_Light reduction: {delta_t_light:.5f}s")
print(f"Final interval (Pure Light): {t_base - delta_t_light:.5f}s")

# With tree +39%
tree_pct = 0.39
delta_t_tree = t_base * (tree_pct / (1.0 + tree_pct))
print(f"Delta T_Tree reduction: {delta_t_tree:.5f}s")
print(f"Final interval (Light + Tree): {t_base - delta_t_light - delta_t_tree:.5f}s")

# With 1 Reso 7-star (20.5%)
reso_pct = 0.205
delta_t_reso = t_base * (reso_pct / (1.0 + reso_pct))
print(f"Delta T_Reso reduction: {delta_t_reso:.5f}s")
print(f"Final interval (Light + Tree + Reso): {max(0.01, t_base - delta_t_light - delta_t_tree - delta_t_reso):.5f}s")
