// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface StringList extends ClassHandle, Iterable<string> {
  push_back(_0: EmbindString): void;
  resize(_0: number, _1: EmbindString): void;
  size(): number;
  get(_0: number): string | undefined;
  set(_0: number, _1: EmbindString): boolean;
}

export interface JSMolListList extends ClassHandle, Iterable<MolList | null> {
  size(): number;
  get(_0: number): MolList | undefined;
  push_back(_0: MolList | null): void;
  resize(_0: number, _1: MolList | null): void;
  set(_0: number, _1: MolList | null): boolean;
}

export interface Mol extends ClassHandle {
  is_valid(): boolean;
  has_coords(): number;
  get_smiles(): string;
  get_smiles(_0: EmbindString): string;
  get_cxsmiles(): string;
  get_cxsmiles(_0: EmbindString): string;
  get_smarts(): string;
  get_smarts(_0: EmbindString): string;
  get_cxsmarts(): string;
  get_cxsmarts(_0: EmbindString): string;
  get_molblock(): string;
  get_molblock(_0: EmbindString): string;
  get_v3Kmolblock(): string;
  get_v3Kmolblock(_0: EmbindString): string;
  get_v2Kmolblock(): string;
  get_v2Kmolblock(_0: EmbindString): string;
  get_as_uint8array(_0: EmbindString): any;
  get_as_uint8array(): any;
  get_inchi(_0: EmbindString): string;
  get_inchi(): string;
  get_json(): string;
  get_svg(): string;
  get_svg(_0: number, _1: number): string;
  get_svg_with_highlights(_0: EmbindString): string;
  combine_with(_0: Mol): string;
  combine_with(_0: Mol, _1: EmbindString): string;
  draw_to_canvas_with_offset(_0: any, _1: number, _2: number, _3: number, _4: number): string;
  draw_to_canvas(_0: any, _1: number, _2: number): string;
  draw_to_canvas_with_highlights(_0: any, _1: EmbindString): string;
  generate_aligned_coords(_0: Mol, _1: any): string;
  get_morgan_fp_as_uint8array(): any;
  get_morgan_fp_as_uint8array(_0: EmbindString): any;
  get_pattern_fp(_0: any): string;
  get_pattern_fp_as_uint8array(): any;
  get_pattern_fp_as_uint8array(_0: any): any;
  get_topological_torsion_fp_as_uint8array(): any;
  get_topological_torsion_fp_as_uint8array(_0: EmbindString): any;
  get_rdkit_fp_as_uint8array(): any;
  get_rdkit_fp_as_uint8array(_0: EmbindString): any;
  get_atom_pair_fp_as_uint8array(): any;
  get_atom_pair_fp_as_uint8array(_0: EmbindString): any;
  get_maccs_fp_as_uint8array(): any;
  get_frags(_0: EmbindString): any;
  get_frags(): any;
  add_to_png_blob(_0: EmbindString, _1: EmbindString): any;
  add_to_png_blob(_0: EmbindString): any;
  get_coords(): any;
  get_substruct_match(_0: Mol): string;
  get_substruct_match(_0: Mol, _1: EmbindString): string;
  get_substruct_matches(_0: Mol): string;
  get_substruct_matches(_0: Mol, _1: EmbindString): string;
  get_descriptors(): string;
  get_morgan_fp(): string;
  get_morgan_fp(_0: EmbindString): string;
  get_pattern_fp(): string;
  get_topological_torsion_fp(): string;
  get_topological_torsion_fp(_0: EmbindString): string;
  get_rdkit_fp(): string;
  get_rdkit_fp(_0: EmbindString): string;
  get_atom_pair_fp(): string;
  get_atom_pair_fp(_0: EmbindString): string;
  get_maccs_fp(): string;
  get_stereo_tags(): string;
  get_aromatic_form(): string;
  convert_to_aromatic_form(): void;
  get_kekule_form(): string;
  convert_to_kekule_form(): void;
  set_new_coords(): boolean;
  get_new_coords(): string;
  set_new_coords(_0: boolean): boolean;
  get_new_coords(_0: boolean): string;
  has_prop(_0: EmbindString): boolean;
  get_prop_list(_0: boolean, _1: boolean): StringList;
  get_prop_list(_0: boolean): StringList;
  get_prop_list(): StringList;
  set_prop(_0: EmbindString, _1: EmbindString, _2: boolean): boolean;
  set_prop(_0: EmbindString, _1: EmbindString): boolean;
  get_prop(_0: EmbindString): string;
  clear_prop(_0: EmbindString): boolean;
  condense_abbreviations(): string;
  condense_abbreviations(_0: number, _1: boolean): string;
  add_hs(): string;
  add_hs_in_place(): boolean;
  remove_hs(_0: EmbindString): string;
  remove_hs(): string;
  remove_hs_in_place(_0: EmbindString): boolean;
  remove_hs_in_place(): boolean;
  normalize_depiction(): number;
  normalize_depiction(_0: number): number;
  normalize_depiction(_0: number, _1: number): number;
  straighten_depiction(): void;
  straighten_depiction(_0: boolean): void;
  get_num_atoms(_0: boolean): number;
  get_num_atoms(): number;
  get_num_bonds(): number;
  copy(): Mol | null;
  get_mmpa_frags(_0: number, _1: number, _2: number): any;
}

export interface MolList extends ClassHandle {
  append(_0: Mol): number;
  insert(_0: number, _1: Mol): number;
  at(_0: number): Mol | null;
  pop(_0: number): Mol | null;
  next(): Mol | null;
  reset(): void;
  at_end(): boolean;
  size(): number;
}

export interface Reaction extends ClassHandle {
  run_reactants(_0: MolList, _1: number): JSMolListList;
  draw_to_canvas_with_offset(_0: any, _1: number, _2: number, _3: number, _4: number): string;
  draw_to_canvas(_0: any, _1: number, _2: number): string;
  draw_to_canvas_with_highlights(_0: any, _1: EmbindString): string;
  get_svg(): string;
  get_svg(_0: number, _1: number): string;
  get_svg_with_highlights(_0: EmbindString): string;
}

export interface SubstructLibrary extends ClassHandle {
  add_mol(_0: Mol): number;
  add_smiles(_0: EmbindString): number;
  add_trusted_smiles(_0: EmbindString): number;
  get_trusted_smiles(_0: number): string;
  add_trusted_smiles_and_pattern_fp(_0: EmbindString, _1: any): number;
  get_pattern_fp_as_uint8array(_0: number): any;
  get_matches_as_uint32array(_0: Mol, _1: boolean, _2: number, _3: number): any;
  get_matches_as_uint32array(_0: Mol, _1: number): any;
  get_matches_as_uint32array(_0: Mol): any;
  get_mol(_0: number): Mol | null;
  get_matches(_0: Mol, _1: boolean, _2: number, _3: number): string;
  get_matches(_0: Mol, _1: number): string;
  get_matches(_0: Mol): string;
  count_matches(_0: Mol, _1: boolean, _2: number): number;
  count_matches(_0: Mol, _1: boolean): number;
  count_matches(_0: Mol): number;
  size(): number;
}

export interface Log extends ClassHandle {
  get_buffer(): string;
  clear_buffer(): void;
}

interface EmbindModule {
  StringList: {
    new(): StringList;
  };
  JSMolListList: {
    new(): JSMolListList;
  };
  Mol: {};
  MolList: {
    new(): MolList;
  };
  Reaction: {};
  SubstructLibrary: {
    new(): SubstructLibrary;
    new(_0: number): SubstructLibrary;
  };
  Log: {};
  version(): string;
  prefer_coordgen(_0: boolean): void;
  use_legacy_stereo_perception(_0: boolean): boolean;
  allow_non_tetrahedral_chirality(_0: boolean): boolean;
  get_inchikey_for_inchi(_0: EmbindString): string;
  get_mol(_0: EmbindString, _1: EmbindString): Mol | null;
  get_mol(_0: EmbindString): Mol | null;
  get_mol_from_uint8array(_0: any): Mol | null;
  get_mol_copy(_0: Mol): Mol | null;
  get_qmol(_0: EmbindString): Mol | null;
  enable_logging(_0: EmbindString): boolean;
  enable_logging(): void;
  disable_logging(_0: EmbindString): boolean;
  disable_logging(): void;
  set_log_capture(_0: EmbindString): Log | null;
  set_log_tee(_0: EmbindString): Log | null;
  get_rxn(_0: EmbindString, _1: EmbindString): Reaction | null;
  get_rxn(_0: EmbindString): Reaction | null;
  get_mcs_as_json(_0: MolList, _1: EmbindString): string;
  get_mcs_as_json(_0: MolList): string;
  get_mcs_as_mol(_0: MolList, _1: EmbindString): Mol | null;
  get_mcs_as_mol(_0: MolList): Mol | null;
  get_mcs_as_smarts(_0: MolList, _1: EmbindString): string;
  get_mcs_as_smarts(_0: MolList): string;
  molzip(_0: Mol, _1: Mol, _2: EmbindString): Mol | null;
  molzip(_0: Mol, _1: Mol): Mol | null;
  get_mol_from_png_blob(_0: any, _1: EmbindString): Mol | null;
  get_mol_from_png_blob(_0: any): Mol | null;
  get_mols_from_png_blob(_0: any, _1: EmbindString): MolList | null;
  get_mols_from_png_blob(_0: any): MolList | null;
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
