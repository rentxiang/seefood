'use client'

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import axios from "axios";
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"


export default function Home() {
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [onsubmit, setOnSubmit] = useState(false)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result?.toString().split(",")[1];
        setBase64Image(base64String || null);
      };
      reader.onerror = (error) => {
        console.error("Error reading file: ", error);
      };
    }
  };

  const handleSubmit = async () => {
    if (!base64Image) {
      console.error("No image to submit.");
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_MISTRAL_API_KEY;
    const model = "pixtral-12b-2409";
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "What's the recipe for this food? Return two parts: one for the recipe and one for the ingredients, Please provide the recipe using the following format:\n\n### Recipe: {Recipe Title}\n\n#### Ingredients:\n{List of Ingredients}\n\n#### Instructions:\n1. {Step 1}\n2. {Step 2}\n...\n",
          },
          {
            type: "image_url",
            image_url: `data:image/jpeg;base64,${base64Image}`,
          },
        ],
      },
    ];

    try {
      const response = await axios.post(
        "https://api.mistral.ai/v1/chat/completions",
        { model, messages },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const fullContent = response.data.choices[0].message.content;
      console.log(fullContent);

      const ingredientsMatch = fullContent.match(/#### Ingredients:([\s\S]*?)#### Instructions:/);
      const recipeMatch = fullContent.match(/#### Instructions:([\s\S]*)/);

      const ingredientsText = ingredientsMatch ? ingredientsMatch[1].trim() : "No ingredients found.";
      const recipeText = recipeMatch ? recipeMatch[1].trim() : "No recipe found.";
      setOnSubmit(!onsubmit)
      setIngredients(ingredientsText);
      setRecipe(recipeText);

      // Call to HeyGen API for video generation
      await generateVideo(recipeText);

      // Set the video URL from the API response if provided
      const videoMatch = fullContent.match(/#### Video URL: (.+)/);
      setVideoUrl(videoMatch ? videoMatch[1].trim() : null);
    } catch (error) {
      console.error("Error submitting image: ", error);
    }
  };

  const generateVideo = async (inputText: string) => {
    const apiKey = process.env.NEXT_PUBLIC_HEYGEN_API_KEY; 

    const videoData = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: "Daisy-inskirt-20220818",
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: inputText,
            voice_id: "2d5b0e6cf36f460aa7fc47e3eee4ba54",
          },
          background: {
            type: "color",
            value: "#008000",
          },
        },
      ],
      dimension: {
        width: 1280,
        height: 720,
      },
      aspect_ratio: "16:9",
      test: true,
    };

    try {
      const response = await axios.post(
        'https://api.heygen.com/v2/video/generate',
        videoData,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
    
      const videoId = response.data.data?.video_id; 
      if (videoId) {
        if (!apiKey) {
          throw new Error("API key is not defined");
        }
    
        const options: RequestInit = {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey, // Ensure apiKey is defined here
          } as HeadersInit, // Type assertion to ensure correct type
        };
    
        // Fetch video status and set the video URL
        const videoStatusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, options);
        if (!videoStatusResponse.ok) {
          throw new Error('Failed to fetch video status');
        }
    
        const videoStatusData = await videoStatusResponse.json();
        setVideoUrl(videoStatusData.video_url || null); // Ensure to handle case where video_url might be undefined
      } else {
        console.error("Video ID not found in response:", response);
      }
      console.log("Video response:", response);
    } catch (error) {
      console.error("Error generating video:", error);
    }
    
    
    
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 sm:p-20 flex flex-col items-center">
      {/* Top Section with Grandma Emoji */}
      <div className="text-center mb-8">
        <div className="text-8xl">👵🍝</div>
        <h1 className="text-4xl font-bold text-gray-800 mt-2">Grandma&apos;s Secret Recipe</h1>
        <p className="text-lg text-gray-600 mt-2">Discover the recipe and ingredients from a picture</p>
      </div>

      {/* Image Upload Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8 w-full max-w-4xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Your Picture</h2>
        <div className="mb-4">
          <Label htmlFor="picture" className="text-gray-700">Select an image:</Label>
          <Input id="picture" type="file" onChange={handleFileChange} className="mt-2" />
        </div>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors mt-4"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>

      {/* Instruction Video Section */}
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-4xl mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Instruction Video</h2>
        {!videoUrl && onsubmit && <Progress value={33} />}
        <Separator className="my-7"/>

        {!videoUrl  && onsubmit && "Loading Video, but you can still watch this:"}

        <div className="flex justify-center">
          <iframe 
            width="560" 
            height="315" 
            src={videoUrl ? videoUrl : "https://www.youtube.com/embed/dQw4w9WgXcQ"} // Replace with your video URL
            title="Instruction Video"
            className="rounded-lg"
            allowFullScreen
          />
        </div>
      </div>

      {/* Recipe and Ingredients Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-4xl mb-8">
        {/* Ingredients section */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ingredients</h2>
          {ingredients ? (
            <div className="text-gray-700">
              {ingredients.split('\n').map((item, index) => (
                <div key={index} className="mb-1">{item.trim()}</div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No ingredients to display yet.</p>
          )}
        </div>

        {/* Recipe section */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recipe</h2>
          {recipe ? (
            <div className="text-gray-700">
              {recipe.split('\n').map((step, index) => (
                <div key={index} className="mb-1">{step.trim()}</div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recipe to display yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
