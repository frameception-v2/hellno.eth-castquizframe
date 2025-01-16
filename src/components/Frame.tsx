"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import { Badge } from "~/components/ui/badge";

import { config } from "~/components/providers/WagmiProvider";
import { PurpleButton } from "~/components/ui/PurpleButton";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function Frame(
  { title }: { title?: string } = { title: PROJECT_TITLE }
) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);

  const quizQuestions: QuizQuestion[] = [
    {
      question: "What is hellno.eth building on Twitch?",
      options: [
        "A no-code builder for frames v2",
        "A new blockchain",
        "A social media platform",
        "A video game"
      ],
      correctAnswer: 0
    },
    {
      question: "What's the name of hellno.eth's Twitch channel?",
      options: [
        "hellnoTV",
        "FarcasterTV",
        "FrameBuilder",
        "CodingWithHellno"
      ],
      correctAnswer: 0
    }
  ];
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>
        
        {showScore ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Quiz Complete!</h2>
            <Badge variant="outline" className="text-lg">
              Your Score: {score}/{quizQuestions.length}
            </Badge>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Question {currentQuestion + 1}/{quizQuestions.length}
            </h2>
            <p className="mb-4">{quizQuestions[currentQuestion].question}</p>
            
            <div className="space-y-2">
              {quizQuestions[currentQuestion].options.map((option, index) => (
                <PurpleButton
                  key={index}
                  className="w-full"
                  onClick={() => {
                    if (index === quizQuestions[currentQuestion].correctAnswer) {
                      setScore(score + 1);
                    }
                    
                    const nextQuestion = currentQuestion + 1;
                    if (nextQuestion < quizQuestions.length) {
                      setCurrentQuestion(nextQuestion);
                    } else {
                      setShowScore(true);
                    }
                  }}
                >
                  {option}
                </PurpleButton>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
