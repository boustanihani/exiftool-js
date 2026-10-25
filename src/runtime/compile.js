// Run-time compiler for Perl code strings that are only known at run time (eg. expressions
// embedded in tag names like "${model;tr/i/_/}", the Filter option, user-defined tags).
// Code strings that appear literally in ExifTool's source are compiled ahead of time; this
// translates the others on demand with the same translator and evaluates them with new Function.
import { PL, H } from './perl.js';
import { CodeGen } from '../../tools/perl2js/codegen.js';
import { GlobalInfo } from '../../tools/perl2js/analyze.js';

// globals: contents of perl2js-globals.json written by the build (symbol information used for
// calling conventions of the translated subs)
export function installCompiler(globals) {
  const gi = new GlobalInfo();
  if (globals) {
    for (const [k, si] of globals.subs) gi.subs.set(k, Object.assign({}, si, { outParams: new Set(si.outParams) }));
    for (const [p, v] of globals.pkgVars) gi.pkgVars.set(p, { '$': new Set(v['$']), '@': new Set(v['@']), '%': new Set(v['%']) });
    for (const p of globals.autoload) gi.autoload.add(p);
    for (const si of gi.subs.values()) {
      if (!gi.methods.has(si.name)) gi.methods.set(si.name, []);
      gi.methods.get(si.name).push(si);
    }
  }
  PL.compileFallback = (src, pkg) => {
    const cg = new CodeGen(gi, '(eval)', { body: [], comments: [] }, {});
    const js = cg.compileEval(src, pkg);
    const aliases = [...cg.aliases];
    const pre = cg.hoistedRegex.join('\n');
    // eslint-disable-next-line no-new-func
    const make = new Function('PL', 'H', ...aliases.map((a) => a[1]), `${pre}\nreturn ${js};`);
    return make(PL, H, ...aliases.map((a) => PL.pkg(a[0])));
  };
}
