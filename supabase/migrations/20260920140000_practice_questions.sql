-- Interview practice question bank (original content written for Career Lighthouse).
-- 60 questions across four categories; see 20260920130000_growth_system.sql for the tables.

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-01$q$, $q$ai-agents$q$, $q$basic$q$, $q$In your own words, what is an LLM agent, and what are its core components?$q$, $q$An LLM agent is a system that uses a language model to decide what actions to take, not just what text to generate. Instead of answering in one shot, it observes, reasons, calls tools, and repeats until the task is done.
- The model acts as the brain: it plans, reasons, and picks the next action.
- Tools let it act on the world: search, code execution, APIs, databases.
- Memory carries context across steps: short-term working context plus longer-term stores.
- An orchestration loop ties these together, feeding tool results back to the model.
- A stopping condition decides when the task is complete or should be escalated to a human.
Tip: Give a concrete example, like a support agent that looks up an order and issues a refund, so the interviewer sees you understand agents as loops, not single prompts.$q$, array[$q$agents$q$, $q$llm$q$, $q$fundamentals$q$]::text[], 10)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-02$q$, $q$ai-agents$q$, $q$basic$q$, $q$Walk me through the ReAct loop. Why does it work better than just asking the model for an answer?$q$, $q$ReAct interleaves reasoning and acting: the model writes a thought about what it needs, takes an action such as a tool call, observes the result, and repeats until it can answer. It beats direct answering because each step is grounded in real observations instead of guesses.
- Thought: the model reasons about what information is still missing.
- Action: it calls a tool, like a search or a calculator, with specific arguments.
- Observation: the tool result is appended to the context for the next step.
- The loop repeats, so mistakes get corrected mid-task rather than baked into a one-shot answer.
- A final answer step exits the loop once the model has enough evidence.
Tip: Mention a failure mode too — ReAct loops can stall or repeat the same action, so production systems cap step counts and detect loops. That detail signals real experience.$q$, array[$q$agents$q$, $q$react$q$, $q$reasoning$q$]::text[], 20)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-03$q$, $q$ai-agents$q$, $q$basic$q$, $q$Explain tool use end to end: how does a model go from a user request to a function actually being called?$q$, $q$The model never executes anything itself; it emits a structured request that my code runs. The flow is: define tools, let the model choose, execute in my application, and feed results back.
- Each tool is declared with a name, description, and a JSON schema for its parameters — the description effectively works as a prompt.
- The user message plus tool definitions go to the model; it either answers directly or returns a tool call with arguments.
- My application validates the arguments, executes the real function, and handles any errors.
- The result goes back to the model as a tool message, and it continues, possibly calling more tools.
- The loop ends when the model responds with plain text instead of another call.
Tip: Emphasise that argument validation and error handling live in your code, not the model — interviewers listen for who is actually responsible for execution.$q$, array[$q$tool use$q$, $q$function calling$q$, $q$llm$q$]::text[], 30)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-04$q$, $q$ai-agents$q$, $q$basic$q$, $q$How does retrieval-augmented generation actually work under the hood?$q$, $q$RAG answers questions using knowledge fetched at query time instead of relying only on what is baked into model weights. Documents are indexed in advance; at query time the most relevant pieces are retrieved and placed into the prompt.
- Ingestion: documents are split into chunks, embedded into vectors, and stored in a vector index alongside metadata.
- Query: the user question is embedded and the nearest chunks are retrieved, often combined with keyword search for exact terms.
- Optional reranking reorders candidates by true relevance using a stronger model.
- Generation: the chunks go into the prompt with instructions to answer only from the provided context and cite sources.
- Quality depends more on retrieval than on generation — bad chunks guarantee a bad answer no matter how good the model is.
Tip: Say that last point out loud. Recognising retrieval as the bottleneck separates people who have built RAG from people who have only read about it.$q$, array[$q$rag$q$, $q$retrieval$q$, $q$embeddings$q$]::text[], 40)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-05$q$, $q$ai-agents$q$, $q$basic$q$, $q$How would you design memory for an agent? What is the difference between short-term and long-term memory?$q$, $q$Short-term memory is the conversation and working state inside the context window; long-term memory is anything that must survive beyond one session, stored externally and retrieved when relevant.
- Short-term: recent messages, tool results, and a scratchpad, managed with truncation or summarisation as the window fills up.
- Long-term: user preferences, past decisions, and learned facts, kept in a database or vector store keyed to the user.
- The writing policy matters: decide what is actually worth remembering, or memory fills with noise.
- The retrieval policy matters just as much: fetch only memories relevant to the current task rather than dumping everything into the prompt.
- Summarised episodic memory, such as what happened last session, is often more useful than raw transcripts.
Tip: Mention staleness — long-term memory needs updating and expiry rules, or the agent will confidently repeat outdated facts about the user.$q$, array[$q$memory$q$, $q$agents$q$, $q$context$q$]::text[], 50)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-06$q$, $q$ai-agents$q$, $q$basic$q$, $q$How do you get an LLM to return reliable structured output, like JSON your code can parse?$q$, $q$I combine model-side constraints with application-side validation, and I never trust the output blindly. Modern APIs offer structured output modes that constrain generation to a schema, which solves most of the problem.
- Define a strict schema, for example with JSON Schema or a library like Zod or Pydantic, and pass it through the model's structured output or tool-calling mode.
- Validate every response against the schema in code; constrained decoding prevents malformed JSON but not wrong values.
- On validation failure, retry with the error message included so the model can self-correct.
- Keep schemas small and flat; deeply nested optional fields raise error rates.
- Add semantic checks on top: an ID field can be valid JSON and still reference something that does not exist.
Tip: The line "valid JSON is not the same as correct data" lands well — it shows you think past the parser.$q$, array[$q$structured output$q$, $q$validation$q$, $q$llm$q$]::text[], 60)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-07$q$, $q$ai-agents$q$, $q$basic$q$, $q$A team wants to customise an LLM for their domain. How do you choose between prompting, RAG, and fine-tuning?$q$, $q$I start with the cheapest option that could work and escalate only with evidence: prompting first, RAG when the problem is knowledge, fine-tuning when the problem is behaviour.
- Prompting handles most tasks: clear instructions, few-shot examples, and good context get you surprisingly far at zero infrastructure cost.
- RAG fits when answers depend on private, large, or frequently changing knowledge — you update the index without touching the model.
- Fine-tuning fits when you need consistent style, a strict output format, or a smaller, cheaper model to mimic a larger one; it is unreliable for injecting facts.
- They combine well: a fine-tuned model sitting on top of a RAG pipeline is a common production setup.
- Measure with an eval set before and after each escalation, or you cannot justify the added cost.
Tip: "Fine-tuning changes behaviour, RAG changes knowledge" is a crisp line interviewers remember.$q$, array[$q$fine-tuning$q$, $q$rag$q$, $q$prompting$q$]::text[], 70)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-08$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$What planning techniques would you reach for — chain-of-thought, tree-of-thoughts, task decomposition — and when is plain prompting enough?$q$, $q$I match the technique to how much search the task needs. Plain prompting is enough when the task is a single step the model has seen thousands of variants of; planning earns its cost when tasks are multi-step or have dead ends.
- Chain-of-thought: ask for step-by-step reasoning; nearly free, and it helps arithmetic, logic, and multi-constraint tasks.
- Decomposition: split a big goal into subtasks, solve each, and compose — useful when a task exceeds the context window or mixes different skills.
- Tree-of-thoughts: explore several branches, evaluate, and backtrack; expensive, so I reserve it for search-like problems such as puzzles or heavily constrained generation.
- Plan-then-execute: write an explicit plan up front so it can be reviewed or cached, instead of deciding step by step.
- Every layer adds latency, cost, and new failure surfaces, so justify it with an eval.
Tip: Saying "I would try plain prompting first and measure" signals engineering maturity, not laziness.$q$, array[$q$planning$q$, $q$prompting$q$, $q$reasoning$q$]::text[], 80)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-09$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$When an agent has many tools available, how does it decide which one to call, and where does that go wrong?$q$, $q$Tool choice is just next-token prediction over the tool names and descriptions in context, so selection quality is largely a prompt-engineering problem. The model matches the user's intent against how each tool describes itself.
- Good descriptions state what the tool does, when to use it, and when not to — ambiguity between similar tools is the top cause of misrouting.
- Too many tools degrade choice; beyond a couple of dozen, group them or retrieve only a relevant subset per query.
- Common failures: calling a plausible tool with wrong arguments, hallucinating a tool that does not exist, skipping the tool and guessing the answer, or looping on the same failed call.
- Mitigations: validate arguments, return actionable error messages the model can react to, and log every call for review.
Tip: A concrete war story beats theory here — describe one misrouted call you have seen and how rewriting the description fixed it.$q$, array[$q$tool use$q$, $q$agents$q$, $q$failure modes$q$]::text[], 90)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-10$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$Your RAG system keeps returning irrelevant passages. How do you think about chunking and improving retrieval quality?$q$, $q$I treat retrieval as its own search problem with its own metrics, separate from generation. Most bad RAG answers trace back to bad chunks or a mismatch between how users phrase queries and how documents are written.
- Chunk along document structure — headings, paragraphs, sections — rather than fixed character counts, with overlap to protect sentences that straddle boundaries.
- Chunks must be understandable alone: prepend the document title or section path, since the embedding only sees the chunk itself.
- Use hybrid search, embeddings plus keyword matching, to catch exact terms like product codes that pure vector search misses.
- Rerank the top candidates with a cross-encoder before the final cut.
- Measure recall on a labelled query set, so every change is compared rather than guessed.
Tip: Name the eval before the fixes — showing you would measure retrieval recall first is what makes the answer sound systematic.$q$, array[$q$rag$q$, $q$chunking$q$, $q$retrieval$q$]::text[], 100)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-11$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$People talk about context engineering. What actually goes into the model's context window, and why?$q$, $q$Context engineering is deciding, for each request, which tokens earn a place in the window — because attention and cost are both finite, and irrelevant content actively hurts quality.
- System prompt: role, rules, and output format, kept stable across requests so it can be cached.
- Task context: retrieved documents, tool results, and user data relevant to this request only.
- History: recent turns verbatim, older turns summarised — not the whole transcript.
- Tool definitions for the tools that matter now, not the entire catalogue.
- Position matters: models attend most to the start and end of the window, so critical instructions and the current question should not be buried in the middle.
Tip: Mentioning the lost-in-the-middle effect and prompt caching shows you think about quality and cost per token at the same time, which is exactly what the job involves.$q$, array[$q$context engineering$q$, $q$prompting$q$, $q$llm$q$]::text[], 110)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-12$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$How do you defend an LLM application against prompt injection?$q$, $q$I assume any text the model reads — web pages, emails, retrieved documents, tool outputs — may contain hostile instructions, and I design so that injected instructions cannot cause real damage. There is no complete fix, so defence is layered.
- Separate trust levels: system instructions come from us; external content is labelled as data, and the model is told never to follow instructions found inside it.
- Limit blast radius: give the agent least-privilege tools, and require human confirmation for irreversible actions like sending money or deleting data.
- Validate tool arguments against allowlists and constrain outputs to expected formats.
- Detect: run injection classifiers on inputs and monitor for anomalous tool-call patterns.
- Red-team regularly with an attack suite, because techniques evolve.
Tip: The strongest line is "model-level defences reduce risk, but the real safety net is what the agent is allowed to do." Interviewers want that systems view.$q$, array[$q$security$q$, $q$prompt injection$q$, $q$agents$q$]::text[], 120)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-13$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$What would you do to reduce hallucinations in a production LLM feature?$q$, $q$First I measure what kind of hallucination it is — ungrounded facts, wrong citations, or overconfident guesses — because each has a different fix. Then the strategy is ground, constrain, and verify.
- Ground answers in retrieved sources and instruct the model to answer only from the provided context, citing what it used.
- Give an explicit out: models hallucinate less when "I don't have enough information" is a permitted answer.
- Add a verification pass for high-stakes outputs: a second model checks each claim against the sources, acting as a groundedness judge.
- Build a hallucination eval into the release process — questions with known answers plus traps the system should refuse — so regressions block shipping.
- In the UI, show sources so users can verify, since some residual rate is unavoidable.
Tip: Quantify it. "We tracked grounded-answer rate weekly" sounds like production experience; "I'd prompt it not to hallucinate" does not.$q$, array[$q$hallucination$q$, $q$rag$q$, $q$evaluation$q$]::text[], 130)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-14$q$, $q$ai-agents$q$, $q$intermediate$q$, $q$Your LLM feature is too slow and too expensive. Walk me through how you would bring latency and cost down.$q$, $q$I profile first — token counts, time to first token, and cost per request by call type — because the biggest wins usually hide in a few heavy prompts. Then I attack tokens, model choice, and perceived latency.
- Prompt caching: keep the stable prefix, like the system prompt and tool definitions, byte-identical across calls so the provider caches it; this often cuts cost dramatically.
- Model routing: send easy requests to a small, cheap model and escalate hard ones to a large model, with a classifier or simple heuristics deciding.
- Streaming: emit tokens as they generate, so perceived latency drops even when total time does not.
- Trim: shorter prompts, capped output length, summarised history — output tokens cost more and generate slowest.
- Cache whole answers for repeated queries and parallelise independent tool calls.
Tip: Lead with measurement and name time-to-first-token specifically — it shows you know which latency users actually feel.$q$, array[$q$latency$q$, $q$cost$q$, $q$caching$q$, $q$routing$q$]::text[], 140)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-15$q$, $q$ai-agents$q$, $q$advanced$q$, $q$When would you split a system into multiple agents, and what new failure modes does that introduce?$q$, $q$I split into multiple agents when a single agent's job gets too broad — its prompt is bloated, its tool set is huge, or subtasks are genuinely parallel. Otherwise one agent stays simpler, cheaper, and easier to debug.
- Benefits: separation of concerns, since each agent gets a focused prompt and a few tools; parallelism for independent subtasks like researching several sources at once; and context isolation, so one agent's noise does not pollute another's window.
- The common shape is orchestrator-worker: a lead agent decomposes the task and delegates, and workers report back.
- New failure modes: miscommunication between agents where summaries drop critical details, duplicated or conflicting work, and error cascades where one agent's mistake becomes another's ground truth.
- Cost and latency multiply with every hop, and debugging now needs traces that span agents.
Tip: State your default plainly — one agent until proven otherwise. Interviewers are wary of candidates who reach for multi-agent because it sounds impressive.$q$, array[$q$multi-agent$q$, $q$architecture$q$, $q$failure modes$q$]::text[], 150)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-16$q$, $q$ai-agents$q$, $q$advanced$q$, $q$How would you evaluate an agent before shipping a change? What does a good offline eval look like?$q$, $q$A good offline eval is a fixed set of realistic tasks, scored automatically, run on every change like a test suite. Without one, every prompt tweak is a gamble.
- Build the dataset from real, anonymised user tasks plus edge cases and known past failures; even thirty to fifty cases catch most regressions.
- Score at two levels: the end-to-end outcome, meaning did it accomplish the task, and the trajectory, meaning did it call the right tools with sensible arguments.
- Use rules for what rules can check — schema validity, required fields, forbidden content — and LLM-as-judge for fuzzy qualities like helpfulness and groundedness.
- Validate the judge itself against human labels before trusting its scores.
- Include hallucination traps: inputs where the correct behaviour is to refuse or say the data is missing, then gate releases on the whole suite.
Tip: Mention judging the judge — calibrating LLM-as-judge against human ratings is the detail most candidates miss.$q$, array[$q$evaluation$q$, $q$llm-as-judge$q$, $q$agents$q$]::text[], 160)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-17$q$, $q$ai-agents$q$, $q$advanced$q$, $q$Would you build an agent on a framework like LangGraph, or directly on the model API? Talk me through the trade-offs.$q$, $q$For anything beyond a prototype I default to the raw API with a thin layer of my own code, and adopt a framework only when I need something it genuinely provides, such as durable state or human-in-the-loop workflows.
- The core agent loop — call model, execute tool, append result, repeat — is under a hundred lines; frameworks wrap it in abstractions you must learn and then debug through.
- Frameworks earn their keep on the hard periphery: persistence, retries, streaming, tracing, and multi-agent orchestration.
- The costs are hidden prompts you do not control, version churn, and being one abstraction away from the actual model calls when things break.
- A middle path works well: raw API for the loop, plus focused libraries for observability and evals.
- Whichever you choose, keep prompts and tool schemas in your own code so you can migrate.
Tip: Show you have read a framework's generated prompts — knowing exactly what it hides is the credible critique.$q$, array[$q$frameworks$q$, $q$architecture$q$, $q$agents$q$]::text[], 170)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$ai-agents-18$q$, $q$ai-agents$q$, $q$advanced$q$, $q$Tell me about a time you debugged an agent that was giving wrong answers. How did you find the cause?$q$, $q$On a RAG-backed support agent, users reported confidently wrong answers about refund policy. Rather than tweaking the prompt, I traced the pipeline to find the first step where the data went wrong.
- I reproduced the failure with the exact user query and pulled the full trace: prompts, retrieved chunks, tool calls, and the final response.
- Working backwards, the model's answer was consistent with its context, so the model was not the problem — the context was.
- The retrieved chunks came from a deprecated policy page; the index had never been refreshed after a docs migration.
- I fixed ingestion, added an index-freshness check, and turned the failing query into a regression eval so it could never silently return.
- The general rule: bisect the pipeline — input, retrieval, tools, reasoning, output — and fix the earliest broken stage, because a better prompt cannot rescue wrong data.
Tip: Interviewers want method, not heroics: lead with traces and bisection, and end with the regression test you added.$q$, array[$q$debugging$q$, $q$observability$q$, $q$agents$q$]::text[], 180)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-01$q$, $q$machine-learning$q$, $q$basic$q$, $q$Can you explain the bias-variance trade-off and why it matters when choosing a model?$q$, $q$The bias-variance trade-off describes the tension between a model that is too simple and one that is too flexible. Bias is error from wrong assumptions — the model underfits and misses real patterns. Variance is error from being too sensitive to the training data — the model overfits and fails to generalise.
- High bias looks like a linear model on curved data: poor scores on both training and test sets.
- High variance looks like a deep unpruned tree: great training score, poor test score.
- Total error is roughly bias squared plus variance plus irreducible noise, so pushing one down usually pushes the other up.
- You manage the trade-off with model complexity, regularisation and more training data.
- Diagnose it by comparing training and validation error: both high means bias, a large gap means variance.
Tip: Give a concrete picture, like a straight line versus a wiggly curve fit to the same points — interviewers want intuition, not just definitions.$q$, array[$q$bias-variance$q$, $q$model selection$q$, $q$fundamentals$q$]::text[], 10)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-02$q$, $q$machine-learning$q$, $q$basic$q$, $q$How would you tell if your model is overfitting, and what would you do about it?$q$, $q$Overfitting means the model has memorised noise in the training data instead of learning the underlying signal, so it performs well on data it has seen and poorly on new data. The classic sign is a large gap between training and validation performance.
- Detect it by tracking training versus validation error, and with learning curves as data or training epochs grow.
- Get more data or augment what you have — usually the most reliable fix.
- Simplify the model: fewer features, shallower trees, fewer parameters.
- Add regularisation such as L1 or L2 penalties, dropout, or early stopping.
- Use cross-validation so your diagnosis does not depend on one lucky split.
Tip: Point out that a small gap is not automatically fine — if both scores are poor you are underfitting, and naming both failure modes shows you see the whole picture.$q$, array[$q$overfitting$q$, $q$regularisation$q$, $q$model evaluation$q$]::text[], 20)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-03$q$, $q$machine-learning$q$, $q$basic$q$, $q$Why do we split data into training, validation and test sets, and what is data leakage?$q$, $q$We split so we can measure performance on data the model has never influenced. The training set fits the model, the validation set tunes hyperparameters and compares candidates, and the test set gives one final unbiased estimate. Data leakage is when information the model should not have at prediction time sneaks into training, making results look better than they will be in production.
- Never touch the test set until the very end, and only once.
- Fit all preprocessing — scaling, imputation, encoders — on training data only, then apply it to the other sets.
- Split by time for time-series data, and by group when the same user appears in multiple rows.
- Watch for leaky features that would not exist at prediction time, like a refund flag when predicting churn.
Tip: A short real story of leakage you caught in a project lands far better than the definition alone.$q$, array[$q$data leakage$q$, $q$train-test split$q$, $q$model evaluation$q$]::text[], 30)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-04$q$, $q$machine-learning$q$, $q$basic$q$, $q$What is cross-validation and when would you use it?$q$, $q$Cross-validation estimates how well a model generalises by training and evaluating it on several different splits of the data rather than just one. In k-fold cross-validation you divide the data into k parts, train on k minus one folds, validate on the held-out fold, and average the k scores.
- It gives a more stable performance estimate than a single split, which matters most on small datasets.
- Use stratified k-fold for classification so each fold keeps the original class balance.
- Use time-series splits, training on the past and validating on the future — random folds would leak the future.
- It is the standard fair way to compare models and tune hyperparameters.
- The cost is roughly k times the training time, so on huge datasets a single validation split is often enough.
Tip: Mention that preprocessing must be fitted inside each fold, otherwise you quietly reintroduce leakage.$q$, array[$q$cross-validation$q$, $q$model evaluation$q$, $q$fundamentals$q$]::text[], 40)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-05$q$, $q$machine-learning$q$, $q$basic$q$, $q$Explain precision, recall, F1 and AUC. How do you decide which metric to optimise?$q$, $q$Precision is the share of predicted positives that are truly positive; recall is the share of actual positives the model catches. F1 is their harmonic mean, useful when you want one number balancing both. AUC measures how well the model ranks positives above negatives across all possible thresholds.
- Choose based on error costs: fraud detection or cancer screening favours recall, because missing a case is the worst outcome.
- Spam filtering or auto-blocking users favours precision, because false alarms are costly.
- Accuracy misleads on imbalanced data — 99 percent accuracy is trivial when 99 percent of cases are negative.
- AUC is threshold-independent and good for comparing models; precision and recall matter once you commit to a threshold.
Tip: Always anchor your metric choice in the business cost of false positives versus false negatives — that reasoning is what interviewers are really testing.$q$, array[$q$metrics$q$, $q$classification$q$, $q$model evaluation$q$]::text[], 50)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-06$q$, $q$machine-learning$q$, $q$basic$q$, $q$How would you explain a machine learning model you built to a non-technical stakeholder?$q$, $q$I would lead with the business outcome, not the algorithm: what decision the model supports, how reliable it is in plain terms, and what that means for their KPI. Then I would use one analogy and one concrete example prediction to make it tangible.
- Translate metrics into their language: "of every 100 customers we flag, about 85 actually churn" beats "precision is 0.85".
- Show which factors drive predictions with a simple ranked list or chart, without technical jargon.
- Walk through one real example end to end so they see the model in action.
- Be upfront about limits: where the model is unsure and what it should never be used for.
- Check understanding by inviting questions rather than presenting one-way.
Tip: In the interview, actually role-play a sentence or two of the explanation — demonstrating the skill beats describing it.$q$, array[$q$communication$q$, $q$stakeholders$q$, $q$explainability$q$]::text[], 60)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-07$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$What is the difference between L1 and L2 regularisation, and when would you pick one over the other?$q$, $q$Both add a penalty on weight size to the loss function to fight overfitting, but they penalise differently. L1, or lasso, penalises the absolute value of weights and drives some exactly to zero, giving sparse models with built-in feature selection. L2, or ridge, penalises squared weights, shrinking all of them smoothly towards zero but rarely to exactly zero.
- Pick L1 when you suspect many features are irrelevant and want a sparse, interpretable model.
- Pick L2 when most features carry some signal or are correlated — L1 arbitrarily keeps one of a correlated group.
- Elastic net combines both penalties and is a solid default when unsure.
- Geometric intuition: L1's diamond-shaped constraint has corners on the axes, which is why solutions land exactly at zero.
- The penalty strength is a hyperparameter you tune with cross-validation.
Tip: Sketching the diamond-versus-circle constraint picture is a memorable way to show real understanding.$q$, array[$q$regularisation$q$, $q$feature selection$q$, $q$linear models$q$]::text[], 70)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-08$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$Your training data has one percent positive cases. How do you handle this class imbalance?$q$, $q$I would fix the evaluation before touching the data: with one percent positives, accuracy is meaningless, so I would use precision-recall, F1 or PR-AUC on a stratified split. Then I would work through techniques in rough order of cost.
- Class weights: most libraries let you weight the minority class higher in the loss — cheap and often sufficient.
- Resampling: oversample the minority class, use SMOTE, or undersample the majority — applied to the training set only, never validation.
- Threshold tuning: lower the decision threshold to trade precision for recall according to business cost.
- Collect more minority examples where possible — better data beats clever tricks.
- If positives are extremely rare, consider reframing it as anomaly detection.
Tip: Saying you would change the metric before changing the data signals maturity — many candidates jump straight to SMOTE.$q$, array[$q$class imbalance$q$, $q$classification$q$, $q$metrics$q$]::text[], 80)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-09$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$Walk me through how you approach feature engineering on a new dataset.$q$, $q$I start by understanding the domain and the target, because good features encode knowledge the raw data does not state directly. From there I work systematically from cleaning to creation to selection.
- Handle missing values and outliers first, and consider whether missingness itself is informative — an indicator flag can help.
- Encode categoricals appropriately: one-hot for low cardinality, target or frequency encoding for high cardinality.
- Create interactions, ratios and aggregations, such as spend per visit or days since last purchase, and extract structure from dates and text, like day of week, seasonality, length and keywords.
- Scale features for distance-based and gradient-based models; tree models do not need scaling.
- Confirm every new feature would actually exist at prediction time, to avoid leakage.
Tip: Bring one example where a single engineered feature clearly beat a fancier model — it makes a very strong interview story.$q$, array[$q$feature engineering$q$, $q$data preparation$q$, $q$workflow$q$]::text[], 90)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-10$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$Explain how gradient descent works and what happens if the learning rate is too high or too low.$q$, $q$Gradient descent minimises a loss function by repeatedly computing the gradient — the direction of steepest increase — and stepping the parameters the opposite way. The learning rate controls the step size and is one of the most important hyperparameters to get right.
- Too high: the loss oscillates or diverges because each step overshoots the minimum.
- Too low: training crawls and can stall in flat regions or shallow local minima.
- Stochastic and mini-batch variants use subsets of data per step — noisier updates but far faster per pass over the data.
- Learning-rate schedules like decay and warm-up, and adaptive optimisers like Adam, adjust step sizes automatically.
- The training loss curve diagnoses the failure: spiking means too high, a slow flat slide means too low.
Tip: Sketching a ball rolling down a bowl, plus the zig-zag of an overshooting step, works well on a whiteboard.$q$, array[$q$gradient descent$q$, $q$optimisation$q$, $q$deep learning$q$]::text[], 100)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-11$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$When would you choose a random forest or gradient boosting over a linear model, and how do those two ensembles differ?$q$, $q$I would choose tree ensembles when relationships are non-linear, features interact, and the data is tabular with mixed types — they usually win on accuracy there. I would stay linear when I need interpretable coefficients, very fast scoring, or when the data is small and high-dimensional, like text with sparse features.
- Random forest trains many deep trees in parallel on bootstrapped samples and averages them — it reduces variance, is hard to overfit badly, and has few knobs.
- Gradient boosting trains shallow trees sequentially, each correcting the previous errors — usually more accurate but more sensitive to tuning and noisy labels.
- Rule of thumb: bagging (forests) reduces variance, boosting reduces bias.
- Libraries like XGBoost and LightGBM dominate tabular benchmarks, but a linear model remains the baseline you must beat.
Tip: Always say you would start with a simple baseline — jumping straight to boosting is a common junior red flag.$q$, array[$q$tree ensembles$q$, $q$gradient boosting$q$, $q$model selection$q$]::text[], 110)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-12$q$, $q$machine-learning$q$, $q$intermediate$q$, $q$What are embeddings, and where would you use them in practice?$q$, $q$An embedding is a learned dense vector that represents something discrete — a word, product, user or image — so that similar things end up close together in the vector space. Instead of a sparse one-hot column, you get a compact numeric representation whose geometry captures meaning learned from data.
- Distance between vectors measures similarity, which powers semantic search and "more like this" recommendations.
- Word and sentence embeddings underpin NLP tasks: classification, clustering and retrieval-augmented generation.
- Entity embeddings of high-cardinality categoricals, like postcode or product ID, often beat one-hot encoding in tabular models.
- Recommenders learn user and item embeddings whose dot product predicts preference.
- They are usually learned as a by-product of training a neural network, or taken from pre-trained models.
Tip: The classic example that king minus man plus woman lands near queen shows the space encodes relationships, not just similarity.$q$, array[$q$embeddings$q$, $q$nlp$q$, $q$recommender systems$q$]::text[], 120)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-13$q$, $q$machine-learning$q$, $q$advanced$q$, $q$Can you explain, at a high level, how attention and the transformer architecture work?$q$, $q$Attention lets a model decide, for each token, how much every other token in the sequence matters, instead of processing tokens strictly in order. Each token is projected into a query, a key and a value; a token's query is compared against all keys, and the resulting weights blend the values — so its new representation is a weighted mix of the whole context.
- Self-attention captures long-range dependencies that recurrent networks struggled with, like linking a pronoun to a distant referent.
- Multi-head attention runs several attention computations in parallel, so different heads learn different kinds of relationships.
- A transformer stacks attention with feed-forward layers, residual connections and positional encodings, since attention alone ignores word order.
- Because tokens are processed in parallel rather than sequentially, transformers train much faster and scale up to today's large language models.
Tip: The line "each word asks every other word how relevant it is" is a compact, accurate summary interviewers respond well to.$q$, array[$q$transformers$q$, $q$attention$q$, $q$deep learning$q$]::text[], 130)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-14$q$, $q$machine-learning$q$, $q$advanced$q$, $q$You are asked to A/B test a new recommendation algorithm. How do you design the test, and what pitfalls do you watch for?$q$, $q$I would define one primary metric and a minimum detectable effect up front, run a power calculation to fix sample size and duration, then randomise users into control and treatment and run the full pre-committed period before reading results.
- Peeking pitfall: repeatedly checking significance and stopping early inflates false positives — commit to the duration or use proper sequential methods.
- Randomise at the user level, not the session level, so nobody sees both variants; watch for interference between users in social or marketplace settings.
- Run at least one full business cycle, typically two weeks, to cover weekday-weekend patterns and novelty effects.
- Check sample-ratio mismatch and covariate balance before trusting any result.
- Correct for multiple comparisons if you monitor many secondary metrics.
Tip: Mentioning novelty effects and sample-ratio mismatch separates candidates who have actually run experiments from those who have only read about them.$q$, array[$q$ab testing$q$, $q$experimentation$q$, $q$statistics$q$]::text[], 140)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$machine-learning-15$q$, $q$machine-learning$q$, $q$advanced$q$, $q$Your model is live in production. What do you monitor, and how do you handle drift?$q$, $q$I would monitor three layers: system health such as latency and error rates, input data quality, and model performance itself. The hard part is that true labels often arrive late, so you need leading indicators that warn you before accuracy visibly drops.
- Data drift: input distributions shift away from training data — track it with statistics like PSI or KL divergence per feature.
- Concept drift: the relationship between inputs and target changes, for example customer behaviour after an interest-rate rise, so performance decays even with stable inputs.
- Track prediction distributions and model confidence as early warnings while labels lag.
- Set alert thresholds, and once drift is confirmed, retrain on recent data through an automated, validated pipeline.
- Keep a shadow or champion-challenger deployment to compare candidate models safely on live traffic.
Tip: Clearly distinguishing data drift from concept drift is the key thing interviewers listen for here.$q$, array[$q$mlops$q$, $q$model monitoring$q$, $q$drift$q$]::text[], 150)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-01$q$, $q$software-engineering$q$, $q$basic$q$, $q$How do you decide between a hash map, an array, and a tree when storing data?$q$, $q$I choose based on which operations dominate: lookups by key, access by position, or ordered traversal. A hash map gives average O(1) lookup by key, an array gives O(1) access by index with great cache locality, and a balanced tree keeps data sorted with O(log n) operations.
- Hash map: fast key lookups, counting and deduplication, but no ordering and some memory overhead.
- Array or list: best when I access by index, iterate over everything, or the data set is small.
- Balanced tree or sorted structure: range queries, ordered iteration, finding the nearest value.
- If I need both fast lookup and order, I use a tree map or keep two structures in sync.
- For small n, a plain array often wins anyway because constants matter more than complexity.
Tip: State the required operations first, then name the structure — it shows you reason from requirements, not memorised defaults.$q$, array[$q$data structures$q$, $q$fundamentals$q$, $q$algorithms$q$]::text[], 10)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-02$q$, $q$software-engineering$q$, $q$basic$q$, $q$What does Big-O notation tell you, and how does it actually influence the code you write day to day?$q$, $q$Big-O describes how running time or memory grows as input size grows, ignoring constants. Day to day it stops me writing code that works in testing but collapses at production scale.
- The classic trap is accidental O(n squared): a loop that calls a contains or includes check on a list for every element.
- Swapping that list scan for a hash set turns each lookup into O(1) and usually fixes it.
- Database calls count too: a query inside a loop is the N+1 problem, effectively n round trips.
- I only optimise when n can genuinely be large; for small fixed inputs, readable beats clever.
- Memory has complexity as well — building a giant intermediate list may matter more than CPU time.
Tip: Give one concrete before-and-after example, like deduplicating a list, and state the complexity of each version.$q$, array[$q$big-o$q$, $q$algorithms$q$, $q$performance$q$]::text[], 20)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-03$q$, $q$software-engineering$q$, $q$basic$q$, $q$Walk me through how you would use git when building a feature with a team.$q$, $q$I branch off main, keep commits small and descriptive, and merge back through a pull request once review and CI pass. The goal is that main stays releasable and my work never blocks anyone else.
- Create a short-lived feature branch named after the ticket, like feature/login-validation.
- Commit logically grouped changes with messages that explain why, not just what.
- Pull or rebase from main regularly so conflicts stay small and easy to resolve.
- When a conflict appears, I read both sides, decide the intended behaviour, re-run the tests, then complete the merge — never blindly accept one side.
- Open the PR early, respond to review comments promptly, and squash-merge if that is the team convention.
Tip: Say you follow the team's existing convention first — it signals you optimise for the team, not personal preference.$q$, array[$q$git$q$, $q$teamwork$q$, $q$version control$q$]::text[], 30)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-04$q$, $q$software-engineering$q$, $q$basic$q$, $q$What is CI/CD, and why does it matter?$q$, $q$Continuous integration means every change is merged frequently and automatically built and tested; continuous delivery or deployment means those verified changes can ship to production quickly, often automatically. It matters because problems are caught minutes after they are introduced instead of weeks later.
- CI runs linting, unit tests and the build on every push, so broken code never quietly lands on main.
- Small, frequent merges make any failure easy to trace to a single change.
- CD automates the release steps, removing error-prone manual deploys.
- Fast feedback lets teams ship daily with confidence instead of doing risky big-bang releases.
- A typical pipeline: push, build, test, deploy to staging, then promote to production behind checks.
Tip: If you have used GitHub Actions or similar in a project, name it and describe one failure the pipeline caught for you.$q$, array[$q$ci/cd$q$, $q$devops$q$, $q$testing$q$]::text[], 40)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-05$q$, $q$software-engineering$q$, $q$basic$q$, $q$Which object-oriented principles do you actually use when writing code, and how?$q$, $q$The ones I lean on daily are encapsulation, single responsibility, polymorphism and composition; inheritance I use sparingly. The point is not reciting SOLID — it is keeping code easy to change and test.
- Encapsulation: expose a small public interface and hide internal state, so callers cannot depend on details I might change.
- Single responsibility: when a class handles parsing and saving and formatting, I split it — small pieces are easier to test.
- Polymorphism through interfaces: code against an abstraction like PaymentProvider so implementations can be swapped and mocked.
- Composition over inheritance: deep class hierarchies get brittle, so I inject collaborators instead of subclassing.
Tip: Anchor each principle in one concrete refactor from a real project — a single genuine example beats listing all five SOLID letters.$q$, array[$q$oop$q$, $q$design$q$, $q$fundamentals$q$]::text[], 50)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-06$q$, $q$software-engineering$q$, $q$basic$q$, $q$What problem do Docker and containers actually solve?$q$, $q$Containers solve the classic it-works-on-my-machine problem by packaging an application together with its runtime, libraries and configuration into one image that runs identically on any host. Unlike a virtual machine, containers share the host kernel, so they start in seconds and use far less memory.
- A Dockerfile describes the environment as code, so setup is versioned and reproducible.
- The same image runs in development, CI and production, eliminating environment drift.
- Isolation lets services with conflicting dependencies run side by side on one machine.
- Containers are the unit that orchestration tools like Kubernetes schedule and scale.
- Compose files spin up an app plus its database locally with a single command.
Tip: Contrast containers with VMs in one sentence — interviewers use this question to check you understand the shared-kernel distinction.$q$, array[$q$docker$q$, $q$containers$q$, $q$devops$q$]::text[], 60)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-07$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$How would you design a clean REST API — say, for managing job applications?$q$, $q$I would model resources as nouns, use HTTP methods as the verbs, and keep everything predictable and stateless. For job applications: GET /applications lists them, POST /applications creates one, GET /applications/42 fetches one, PATCH updates it, DELETE removes it.
- Use proper status codes: 201 on create, 400 for bad input, 404 for a missing resource, 401 and 403 for auth problems.
- Keep the API stateless so any server can handle any request; auth travels with each request as a token.
- Support filtering and pagination on list endpoints, like ?status=interview&page=2, instead of returning everything.
- Version the API, such as /v1/, so it can evolve without breaking existing clients.
- Validate input on the server and return error bodies that say exactly what was wrong.
Tip: Sketch two or three concrete endpoints out loud — real URLs and verbs demonstrate understanding faster than reciting REST constraints.$q$, array[$q$rest$q$, $q$api design$q$, $q$backend$q$]::text[], 70)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-08$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$Explain the different SQL joins, and when would you add an index to a table?$q$, $q$A join combines rows from two tables on a matching condition. INNER JOIN keeps only rows that match in both tables; LEFT JOIN keeps every row from the left table with NULLs where the right side has no match; RIGHT and FULL OUTER are the mirror and the union of both.
- Example: users LEFT JOIN applications shows all users, including those who never applied.
- I add an index when a column appears often in WHERE clauses, JOIN conditions or ORDER BY on a large table.
- An index turns a full table scan into a fast lookup, but every write must also update it, so indexing everything slows inserts.
- Foreign key columns used in joins are usually the first candidates.
- I confirm with EXPLAIN before and after adding one, rather than guessing.
Tip: Mentioning EXPLAIN or reading a query plan signals real experience — say you measure instead of assuming.$q$, array[$q$sql$q$, $q$databases$q$, $q$indexing$q$]::text[], 80)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-09$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$What is the testing pyramid, and how do you decide what to unit test?$q$, $q$The pyramid says to have many fast unit tests at the base, fewer integration tests in the middle, and a handful of end-to-end tests on top, because tests get slower and flakier as you move up. I unit test the logic most likely to break: branching, edge cases and calculations.
- Unit test pure business logic heavily: validation rules, price or date calculations, error paths.
- Skip trivial getters and framework glue; testing them is cost without protection.
- Integration tests cover the seams: does my code talk to the real database or external API correctly?
- A few end-to-end tests protect critical user journeys, like signup and checkout.
- When a bug escapes to production, write the test that would have caught it before fixing.
Tip: Say you test behaviour, not implementation — tests that break on every refactor are a smell interviewers recognise.$q$, array[$q$testing$q$, $q$quality$q$, $q$unit tests$q$]::text[], 90)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-10$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$What web security basics do you apply as a developer — XSS, SQL injection, and handling secrets?$q$, $q$The common thread is never trusting input and never hard-coding credentials. SQL injection happens when user input is concatenated straight into a query; XSS happens when user input is rendered into a page as live HTML or script.
- Prevent SQL injection with parameterised queries or an ORM — input is treated as data, never as SQL.
- Prevent XSS by escaping output and using frameworks that escape by default; sanitise anywhere you must render user HTML.
- Add a Content-Security-Policy header as an extra layer against injected scripts.
- Keep secrets in environment variables or a secret manager, never in code — one leaked commit means rotating the key immediately.
- Validate on the server; client-side validation is user experience, not security.
Tip: Show you know the actual fix, like naming prepared statements, rather than only naming the attacks.$q$, array[$q$security$q$, $q$web$q$, $q$backend$q$]::text[], 100)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-11$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$How do you give a good code review, and how do you handle feedback on your own code?$q$, $q$When giving a review, I aim to catch real problems and share knowledge while keeping the author's momentum; when receiving one, I treat comments as input about the code, not a judgement of me.
- First understand what the change is trying to do, then check correctness, edge cases and tests before style.
- Comment with reasons and suggestions, like: this breaks when the list is empty, maybe guard here — and separate blocking issues from nitpicks.
- Keep reviews small and prompt; a two-thousand-line PR gets a polite request to split, not a rubber stamp.
- On my own PRs, I ask clarifying questions, fix agreed points quickly, and push back respectfully with reasons when I disagree.
- If a thread drags past a few rounds, I suggest a quick call instead.
Tip: Interviewers listen for ego here — one story of gladly accepting a correction lands very well.$q$, array[$q$code review$q$, $q$teamwork$q$, $q$communication$q$]::text[], 110)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-12$q$, $q$software-engineering$q$, $q$intermediate$q$, $q$A bug is reported in production but you cannot reproduce it locally. How do you debug it systematically?$q$, $q$I resist guessing and work from evidence: gather facts, reproduce, narrow, fix, verify, then prevent. The first goal is turning it-is-broken into a precise statement of expected versus actual behaviour.
- Gather the facts: exact error, logs and stack traces, which users are affected, when it started, and what deployed around that time.
- Try to reproduce with production-like data or conditions; a bug you can trigger on demand is half solved.
- Test one hypothesis at a time — binary-search the cause through recent commits, feature flags, or targeted logging.
- Fix the root cause, not the symptom, and add a regression test that fails without the fix.
- Afterwards, ask why it was not caught earlier and improve monitoring or tests accordingly.
Tip: Say you check what changed recently first — most production bugs trace back to a recent deploy, config change or data shift.$q$, array[$q$debugging$q$, $q$production$q$, $q$problem solving$q$]::text[], 120)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-13$q$, $q$software-engineering$q$, $q$advanced$q$, $q$Explain concurrency versus parallelism, and give me an example of a race condition.$q$, $q$Concurrency is structuring a program so multiple tasks make progress in overlapping time periods; parallelism is literally executing tasks at the same instant on multiple cores. A single-core machine can be concurrent but never parallel.
- Concurrency example: a web server interleaving thousands of requests while each one waits on I/O.
- Parallelism example: splitting an image across eight cores and processing the parts simultaneously.
- Race condition: two requests read an account balance of 100, each adds 50, each writes 150 — one update is lost and the balance should be 200.
- The bug is a non-atomic read-modify-write on shared state; timing decides the outcome, so it appears intermittently and is hard to reproduce.
- Fixes: locks, atomic operations, database transactions with proper isolation, or avoiding shared mutable state entirely.
Tip: Walk through the lost-update example step by step with concrete numbers — it proves understanding rather than recitation.$q$, array[$q$concurrency$q$, $q$parallelism$q$, $q$race conditions$q$]::text[], 130)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-14$q$, $q$software-engineering$q$, $q$advanced$q$, $q$Where would you add caching in a web application, and why is cache invalidation considered hard?$q$, $q$I cache where the same expensive result is read far more often than it changes: database query results in Redis, rendered pages or API responses at a CDN, computed values in application memory. Invalidation is hard because the moment source data changes, every cached copy is silently wrong, and you rarely control all the places a copy lives.
- Cache at the layer closest to the user that still gives correct results: browser, CDN, application, then database.
- Always set a TTL as the safety net — stale data expires even if invalidation logic fails.
- On writes, either delete the affected keys (simple and safe) or update them in place (faster but riskier).
- Watch for the failure modes: stale reads, thundering herds when a hot key expires, and drift between cache layers.
- Only cache after measuring; caching a cheap query adds complexity for nothing.
Tip: Naming a concrete default like cache-aside with TTL plus delete-on-write impresses more than listing every pattern.$q$, array[$q$caching$q$, $q$system design$q$, $q$performance$q$]::text[], 140)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$software-engineering-15$q$, $q$software-engineering$q$, $q$advanced$q$, $q$Design a URL shortener like bit.ly. Walk me through your approach.$q$, $q$I would clarify scale first, then design for a read-heavy workload: shortening is rare, redirecting is constant. Core flow: POST a long URL, generate a short code, store the mapping, and on GET redirect the visitor.
- Generate codes by base62-encoding an auto-incrementing ID — six characters give roughly 57 billion combinations with no collisions to handle.
- Store mappings in a simple key-value style table: short_code, long_url, created_at, plus owner and expiry if needed.
- Cache hot codes in Redis, since a small fraction of links receives most of the traffic.
- Choose the redirect deliberately: 302 keeps every click hitting your server for analytics, 301 lets browsers cache and reduces load.
- The service is stateless, so it scales horizontally behind a load balancer, with read replicas for the database.
Tip: State your traffic assumptions out loud before designing — interviewers grade the reasoning process more than the final diagram.$q$, array[$q$system design$q$, $q$scalability$q$, $q$backend$q$]::text[], 150)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-01$q$, $q$finance$q$, $q$basic$q$, $q$Why do bond prices fall when interest rates rise?$q$, $q$Bond prices and interest rates move in opposite directions because a bond's cash flows are fixed. When market rates rise, newly issued bonds pay higher coupons, so an existing bond paying the old, lower coupon becomes less attractive and its price must fall until its yield matches what the market now offers.
- A bond's price is the present value of its fixed coupons and principal, discounted at current market rates.
- A higher discount rate means a lower present value, so rising rates push prices down mechanically.
- Longer-maturity and lower-coupon bonds are more sensitive to rate moves; duration measures this sensitivity.
- Simple example: a bond paying 3% looks unattractive once new bonds pay 5%, so its price drops until a buyer earns a competitive yield.
Tip: Anchor your answer in present value first, then mention duration to show you can go one level deeper.$q$, array[$q$bonds$q$, $q$fixed income$q$, $q$interest rates$q$]::text[], 10)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-02$q$, $q$finance$q$, $q$basic$q$, $q$What does the P/E ratio tell you, and what are its limitations?$q$, $q$The P/E ratio is share price divided by earnings per share, so it tells you how many dollars investors pay for each dollar of earnings. It is a quick way to compare valuation across similar companies, but it can mislead if used blindly.
- A high P/E can signal expected earnings growth, or simply an overpriced stock; a low P/E can mean value or a business in decline.
- It only works when earnings are positive and reasonably stable, so it breaks down for loss-making or highly cyclical companies.
- Accounting choices and one-off items distort reported earnings, which is why analysts often adjust to a normalised or forward EPS.
- It ignores capital structure, so companies with different debt levels are not directly comparable; EV/EBITDA handles that better.
Tip: Always say a multiple is only meaningful relative to comparable companies and the firm's own history.$q$, array[$q$valuation$q$, $q$ratios$q$, $q$equities$q$]::text[], 20)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-03$q$, $q$finance$q$, $q$basic$q$, $q$What is the difference between a market order and a limit order, and when would you use each?$q$, $q$A market order executes immediately at the best available price, prioritising speed and certainty of execution. A limit order sets a maximum buy price or minimum sell price, prioritising price but with no guarantee it fills.
- Market orders suit liquid stocks and urgent trades, but in a thin market a large one can walk through the order book and get a much worse average price, called slippage.
- Limit orders protect you on price and can earn the spread, but you risk missing the trade if the market moves away.
- Liquidity is the key link: tight bid-ask spreads and deep order books make market orders cheap; wide spreads make limit orders safer.
- Traders often split large orders over time to reduce market impact.
Tip: Frame the trade-off as certainty of execution versus certainty of price, then bring in liquidity to stand out.$q$, array[$q$markets$q$, $q$trading$q$, $q$liquidity$q$]::text[], 30)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-04$q$, $q$finance$q$, $q$basic$q$, $q$Why does diversification reduce portfolio risk?$q$, $q$Diversification reduces risk because different assets do not move perfectly together. When one holding falls, others may hold steady or rise, so the swings partly offset and the portfolio's overall volatility is lower than the average volatility of its parts.
- The key driver is correlation: the lower the correlation between assets, the greater the risk reduction from combining them.
- Diversification removes idiosyncratic risk, which is specific to one company, such as a failed product or a lawsuit.
- It cannot remove systematic risk, the market-wide risk from recessions or rate shocks, which is why even broad portfolios fall in a crash.
- Benefits come from spreading across companies, sectors, asset classes and geographies, not just holding more of similar stocks.
Tip: Mention that correlations tend to rise in a crisis, exactly when diversification is needed most; interviewers like that nuance.$q$, array[$q$portfolio$q$, $q$risk$q$, $q$diversification$q$]::text[], 40)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-05$q$, $q$finance$q$, $q$basic$q$, $q$What factors move a currency's exchange rate?$q$, $q$A currency's value reflects supply and demand for it, driven mainly by interest rate differentials, economic fundamentals and risk sentiment. In the short run flows and expectations dominate; in the long run fundamentals like inflation matter more.
- Interest rate differentials: higher rates attract foreign capital seeking yield, which bids the currency up, so central bank decisions and rate expectations are the biggest short-term driver.
- Inflation: persistently high inflation erodes purchasing power and tends to weaken a currency over time.
- Trade and commodity flows: exporters earn foreign currency, so a commodity exporter like Australia sees the AUD track iron ore and energy prices.
- Growth and stability: strong growth and sound institutions attract investment; political risk drives capital out.
- Risk sentiment: in a crisis, money flows into safe havens like the USD.
Tip: Structure the answer as short-run drivers versus long-run drivers to sound organised.$q$, array[$q$fx$q$, $q$macro$q$, $q$markets$q$]::text[], 50)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-06$q$, $q$finance$q$, $q$intermediate$q$, $q$How do the three financial statements link together?$q$, $q$The income statement, balance sheet and cash flow statement are connected through net income, cash and retained earnings. A clean way to show it is to trace one period through all three.
- Net income from the income statement is the starting line of the cash flow statement and flows into retained earnings on the balance sheet.
- The cash flow statement adds back non-cash items like depreciation, adjusts for changes in working capital, and includes investing and financing flows to get the net change in cash.
- That closing cash figure becomes the cash balance on the balance sheet, which then must balance: assets equal liabilities plus equity.
- Balance sheet items feed back the other way too: PP&E drives depreciation, and debt drives interest expense on the income statement.
Tip: If asked how a $10 depreciation increase flows through, work statement by statement and state the tax effect explicitly.$q$, array[$q$accounting$q$, $q$financial statements$q$, $q$technicals$q$]::text[], 60)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-07$q$, $q$finance$q$, $q$intermediate$q$, $q$What is the difference between NPV and IRR, and which do you prefer for evaluating a project?$q$, $q$NPV is the present value of a project's cash flows discounted at the required rate of return, minus the initial investment; it measures value created in dollars. IRR is the discount rate that makes NPV equal zero; it measures the project's implied percentage return. I generally prefer NPV.
- Decision rules: accept if NPV is positive, or if IRR exceeds the hurdle rate; for a single conventional project they usually agree.
- They can conflict when ranking mutually exclusive projects, because IRR ignores scale: a small project can have a high IRR but create less total value.
- IRR assumes interim cash flows are reinvested at the IRR itself, which is often unrealistic, and projects with alternating cash flow signs can have multiple IRRs.
- NPV uses a consistent discount rate and directly measures shareholder value added.
Tip: State your preference for NPV clearly, then justify it; interviewers reward a firm, reasoned view.$q$, array[$q$corporate finance$q$, $q$npv$q$, $q$irr$q$]::text[], 70)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-08$q$, $q$finance$q$, $q$intermediate$q$, $q$Explain CAPM and how you would use it to estimate a company's cost of equity.$q$, $q$CAPM says the expected return on a stock equals the risk-free rate plus beta times the equity risk premium: cost of equity = rf + beta x (market return - rf). It prices only systematic risk, on the logic that diversifiable risk should not be rewarded.
- Risk-free rate: use the yield on a long-term government bond, such as the 10-year, matching the currency of the cash flows.
- Beta: measures the stock's sensitivity to market moves; for private companies, take comparable companies' betas, unlever them, and relever at the target capital structure.
- Equity risk premium: the extra return investors demand for holding equities over the risk-free asset, typically around 4 to 6 percent from historical or survey estimates.
- The output feeds into WACC as the equity component when discounting cash flows in a DCF.
Tip: Acknowledge CAPM's limits, beta instability and single-factor simplicity, to show you use it thoughtfully rather than mechanically.$q$, array[$q$capm$q$, $q$cost of equity$q$, $q$valuation$q$]::text[], 80)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-09$q$, $q$finance$q$, $q$intermediate$q$, $q$What are call and put options, and how does using options to hedge differ from using them to speculate?$q$, $q$A call option gives the holder the right, but not the obligation, to buy an asset at a set strike price before expiry; a put gives the right to sell. The buyer pays a premium for that right, and the seller takes on the obligation in exchange for it.
- A call gains value when the underlying rises above the strike; a put gains value when it falls below.
- The buyer's maximum loss is the premium paid; an uncovered option seller faces potentially large losses.
- Hedging uses options to offset an existing exposure, like a fund buying puts on shares it owns, so it works like insurance and reduces overall risk.
- Speculation uses options to take a new leveraged view on direction or volatility, with no offsetting position, which increases risk.
Tip: A concrete example, such as an Australian exporter buying AUD puts to protect USD revenue, makes the hedging point land.$q$, array[$q$options$q$, $q$derivatives$q$, $q$hedging$q$]::text[], 90)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-10$q$, $q$finance$q$, $q$intermediate$q$, $q$What are the main types of risk a bank manages, and how does it manage them?$q$, $q$The three core categories are market risk, credit risk and operational risk, with liquidity risk usually treated as a fourth. A bank's job is essentially to take these risks deliberately, measure them, and hold capital against them.
- Market risk: losses from moves in rates, FX, equities or commodities on trading and banking books; managed with position limits, Value-at-Risk models, stress tests and hedging.
- Credit risk: a borrower or counterparty failing to pay; managed through credit assessment, collateral, exposure limits, diversification and provisioning, and it is typically a bank's largest risk.
- Operational risk: losses from failed processes, systems, people or external events, including fraud and cyber attacks; managed with controls, segregation of duties and contingency planning.
- Liquidity risk: being unable to meet obligations as they fall due; managed by holding liquid assets and diversifying funding.
- Regulators require capital buffers against these under the Basel framework.
Tip: Naming a real example, like a rogue-trader loss for operational risk, shows the concepts are not just memorised.$q$, array[$q$risk management$q$, $q$banking$q$, $q$regulation$q$]::text[], 100)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-11$q$, $q$finance$q$, $q$advanced$q$, $q$Walk me through a DCF valuation.$q$, $q$A DCF values a company as the present value of the cash it will generate in the future. You forecast unlevered free cash flows, discount them at the weighted average cost of capital, add a terminal value, and bridge from enterprise value to equity value.
- Project unlevered free cash flow for 5 to 10 years: EBIT less taxes, plus depreciation and amortisation, minus capex and changes in net working capital.
- Calculate WACC by weighting the after-tax cost of debt and the cost of equity from CAPM by the target capital structure.
- Estimate terminal value using the Gordon growth method with a modest perpetual growth rate, or an exit multiple, then discount everything back to today.
- Sum the present values to get enterprise value, subtract net debt and minority interests to reach equity value, and divide by shares outstanding.
- Sanity-check with sensitivity tables on WACC and terminal growth, since terminal value often dominates.
Tip: Expect follow-ups on any line you mention, so only name inputs you can defend.$q$, array[$q$dcf$q$, $q$valuation$q$, $q$technicals$q$]::text[], 110)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;

insert into public.practice_questions (id, category, difficulty, question, answer, tags, sort) values
($q$finance-12$q$, $q$finance$q$, $q$advanced$q$, $q$If I asked you to pitch me a stock, how would you structure your answer?$q$, $q$I would give a clear recommendation up front, then support it with a tight structure: thesis, business overview, catalysts, valuation and risks, all in about two minutes. The goal is a defensible view, not a perfect forecast.
- Recommendation and thesis: name the stock, say buy or sell, and give two or three reasons the market is mispricing it.
- Business overview: one or two lines on what the company does, its market position and how it makes money.
- Catalysts: specific upcoming events that could close the gap, such as earnings, a product launch or a regulatory decision.
- Valuation: a target price backed by a multiple versus peers or a quick DCF, showing meaningful upside.
- Risks and mitigants: name the two biggest things that could go wrong and why you still hold the view.
Tip: Prepare one long pitch and one short version before interviews, and pick a stock you genuinely follow; the follow-up questions are where pitches fall apart.$q$, array[$q$stock pitch$q$, $q$equities$q$, $q$interview skills$q$]::text[], 120)
on conflict (id) do update set category = excluded.category, difficulty = excluded.difficulty,
  question = excluded.question, answer = excluded.answer, tags = excluded.tags, sort = excluded.sort;
