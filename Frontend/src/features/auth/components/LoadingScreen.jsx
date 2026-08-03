import React from 'react'
import '../loading.scss'

const LoadingScreen = ({message,sub}) => {

  return (
    <div className='loading-screen'>
            <div className='loader'>
                <div className='loader__ring-wrap'>
                    <div className='loader__ring'></div>
                    <div className='loader__ring-inner'></div>
                    <div className='loader__dot'></div>
                </div>
                <div className='loader__text-group'>
                    <span className='loader__label'>
                        {message}
                        <span className='loader__dots'>
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                    </span>
                    <span className='loader__sub'>{sub}</span>
                </div>
                <div className='loader__bar-wrap'>
                    <div className='loader__bar'></div>
                </div>
            </div>
        </div>
  )
}

export default LoadingScreen
