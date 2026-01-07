from langchain_ollama import ChatOllama

# 1. 내 컴퓨터에 있는 Llama 3.1 모델을 불러옵니다.
print("🤖 Llama를 깨우는 중입니다... (컴퓨터 성능에 따라 조금 걸릴 수 있어요)")
llm = ChatOllama(model="llama3.1", temperature=0)

# 2. 질문을 던져봅니다.
question = "여권 발급은 어디서 해야 해? 짧게 한국어로 대답해줘."
print(f"❓ 질문: {question}")

# 3. 답변을 받습니다.
response = llm.invoke(question)

print("-" * 30)
print(f"💬 답변: {response.content}")
print("-" * 30)