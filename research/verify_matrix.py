# Verification script for the attack speed formula from the article

def calc_final_interval(base_raw, pu_reduction, dots, tree_pct, light_count, light_pct_each, reso_count, reso_pct_each):
    base_in_game = (base_raw - pu_reduction) / dots
    
    # Reductions
    red_tree = base_in_game - base_in_game / (1.0 + tree_pct) if tree_pct > 0 else 0
    
    light_total_pct = light_count * light_pct_each
    red_light = base_in_game - base_in_game / (1.0 + light_total_pct) if light_total_pct > 0 else 0
    
    reso_total_pct = reso_count * reso_pct_each
    red_reso = base_in_game - base_in_game / (1.0 + reso_total_pct) if reso_total_pct > 0 else 0
    
    total_red = red_tree + red_light + red_reso
    final_interval = base_in_game - total_red
    
    return base_in_game, total_red, max(0.01, final_interval), final_interval <= 0.01

# Test case from article:
# Base 2.7, PU -0.88, dots 7 -> base_in_game = 0.26
# tree +39% (0.39), passive 5 (light 38.8%, reso 23.3%), light 3, reso 1
base_in_game, total_red, final_int, reach_cap = calc_final_interval(2.7, 0.88, 7, 0.39, 3, 0.388, 1, 0.233)
print(f"Sample test: base={base_in_game:.4f}, total_red={total_red:.4f}, final={final_int:.4f}, reach_cap={reach_cap}")

# Let's test all configurations in the matrix
tree_options = [0.39, 0.15, 0.07]
passive_options = {
    5: (0.388, 0.233),
    15: (0.408, 0.253),
    30: (0.438, 0.283)
}

print("\n--- MATRIX VERIFICATION ---")
for tree in tree_options:
    print(f"\n=== Tree: +{int(tree*100)}% ===")
    for p_lvl, (l_pct, r_pct) in passive_options.items():
        print(f"-- Passive Lv {p_lvl} (Light={l_pct*100:.1f}%, Reso={r_pct*100:.1f}%) --")
        # test configurations
        configs = [
            ("Light 3 + Reso 1", 3, 1),
            ("Light 2 + Reso 2", 2, 2),
            ("Light 1 + Reso 3", 1, 3),
            ("Light 2 + Reso 1", 2, 1),
            ("Light 4 + Reso 1", 4, 1),
            ("Light 3 + Reso 2", 3, 2),
            ("Light 2 + Reso 3", 2, 3),
            ("Light 1 + Reso 4", 1, 4),
            ("Light 4 + Reso 2", 4, 2),
            ("Light 3 + Reso 3", 3, 3),
            ("Light 2 + Reso 4", 2, 4),
            ("Light 5 + Reso 1", 5, 1),
            ("Pure Light 4", 4, 0),
            ("Pure Light 5", 5, 0),
            ("Pure Light 6", 6, 0),
        ]
        for name, lc, rc in configs:
            _, _, final_int, reach_cap = calc_final_interval(2.7, 0.88, 7, tree, lc, l_pct, rc, r_pct)
            if reach_cap:
                print(f"  [OK] {name} -> reached 0.01 (final: {final_int:.4f})")
            # else:
            #     print(f"  [FAIL] {name} -> final: {final_int:.4f}")
